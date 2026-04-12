package service

import (
	"context"
	"fmt"
	"log/slog"
	"net/url"
	"time"

	"github.com/google/uuid"
	db "github.com/yourname/generate-cv/db/sqlc"
	"github.com/yourname/generate-cv/internal/worker/tasks"
	"github.com/yourname/generate-cv/pkg/payment"
)

// Giá gói (VND).
const (
	PriceWeekly  int64 = 49_000
	PriceMonthly int64 = 149_000

	DurationWeekly  = 7 * 24 * time.Hour
	DurationMonthly = 30 * 24 * time.Hour
)

// CreatePaymentRequest — input từ handler.
type CreatePaymentRequest struct {
	UserID   uuid.UUID
	Plan     string // "weekly" | "monthly"
	Method   string // "vnpay" | "momo"
	ClientIP string // dùng cho VNPay
}

// CreatePaymentResponse — output trả về client.
type CreatePaymentResponse struct {
	TransactionID string `json:"transaction_id"`
	PaymentURL    string `json:"payment_url"`
}

// PaymentService xử lý toàn bộ business logic thanh toán.
type PaymentService struct {
	queries   *db.Queries
	vnpay     *payment.VNPayProvider
	momo      *payment.MoMoProvider
	taskQueue tasks.Enqueuer
	log       *slog.Logger
}

// NewPaymentService khởi tạo service.
func NewPaymentService(
	q *db.Queries,
	vnpay *payment.VNPayProvider,
	momo *payment.MoMoProvider,
	enqueuer tasks.Enqueuer,
	log *slog.Logger,
) *PaymentService {
	return &PaymentService{
		queries:   q,
		vnpay:     vnpay,
		momo:      momo,
		taskQueue: enqueuer,
		log:       log,
	}
}

// CreatePayment tạo bản ghi pending + trả URL thanh toán.
func (s *PaymentService) CreatePayment(ctx context.Context, req CreatePaymentRequest) (*CreatePaymentResponse, error) {
	// Xác định số tiền theo gói
	amount, err := planToAmount(req.Plan)
	if err != nil {
		return nil, err
	}

	// Tạo bản ghi pending trong DB
	txn, err := s.queries.CreatePaymentTransaction(ctx, db.CreatePaymentTransactionParams{
		UserID:    req.UserID,
		Plan:      req.Plan,
		Method:    req.Method,
		AmountVnd: int32(amount),
	})
	if err != nil {
		return nil, fmt.Errorf("payment: create transaction record: %w", err)
	}

	txnIDStr := txn.ID.String()
	orderInfo := fmt.Sprintf("Generate CV - Gói %s", req.Plan)

	var payURL string

	switch req.Method {
	case "vnpay":
		payURL = s.vnpay.CreatePaymentURL(txnIDStr, amount, orderInfo, req.ClientIP)

	case "momo":
		momoResp, err := s.momo.CreatePaymentURL(ctx, txnIDStr, amount, orderInfo)
		if err != nil {
			s.log.Error("momo create payment failed", "txn_id", txnIDStr, "err", err)
			return nil, fmt.Errorf("payment: momo create url: %w", err)
		}
		payURL = momoResp.PayURL

	default:
		return nil, fmt.Errorf("payment: unsupported method %q", req.Method)
	}

	s.log.Info("payment created", "txn_id", txnIDStr, "plan", req.Plan, "method", req.Method)

	return &CreatePaymentResponse{
		TransactionID: txnIDStr,
		PaymentURL:    payURL,
	}, nil
}

// HandleVNPayCallback xử lý redirect callback (GET) từ VNPay.
// Trả về (success bool, txnID string).
func (s *PaymentService) HandleVNPayCallback(ctx context.Context, queryParams url.Values) (bool, string, error) {
	if !s.vnpay.VerifyWebhook(queryParams) {
		return false, "", fmt.Errorf("vnpay: invalid signature")
	}

	txnRef, transactionNo := payment.ExtractVNPayInfo(queryParams)
	success := payment.IsVNPaySuccess(queryParams)

	if err := s.finalizeTransaction(ctx, txnRef, transactionNo, success); err != nil {
		return false, txnRef, err
	}

	return success, txnRef, nil
}

// HandleVNPayWebhook xử lý IPN (POST) server-to-server từ VNPay.
func (s *PaymentService) HandleVNPayWebhook(ctx context.Context, queryParams url.Values) error {
	if !s.vnpay.VerifyWebhook(queryParams) {
		return fmt.Errorf("vnpay webhook: invalid signature")
	}

	txnRef, transactionNo := payment.ExtractVNPayInfo(queryParams)
	success := payment.IsVNPaySuccess(queryParams)

	return s.finalizeTransaction(ctx, txnRef, transactionNo, success)
}

// HandleMoMoWebhook xử lý IPN (POST) từ MoMo.
func (s *PaymentService) HandleMoMoWebhook(ctx context.Context, payload *payment.MoMoIPNPayload) error {
	if !s.momo.VerifyIPN(payload) {
		return fmt.Errorf("momo webhook: invalid signature")
	}

	providerRef := fmt.Sprintf("%d", payload.TransID)
	success := s.momo.IsSuccess(payload)

	return s.finalizeTransaction(ctx, payload.OrderID, providerRef, success)
}

// finalizeTransaction cập nhật DB (idempotent) và kích hoạt subscription nếu success.
func (s *PaymentService) finalizeTransaction(ctx context.Context, txnID, providerRef string, success bool) error {
	parsedID, err := uuid.Parse(txnID)
	if err != nil {
		return fmt.Errorf("finalize: invalid txn_id %q: %w", txnID, err)
	}

	var txn db.PaymentTransaction

	if success {
		txn, err = s.queries.UpdatePaymentTransactionSuccess(ctx, db.UpdatePaymentTransactionSuccessParams{
			ID:          parsedID,
			ProviderRef: providerRef,
		})
	} else {
		txn, err = s.queries.UpdatePaymentTransactionFailed(ctx, db.UpdatePaymentTransactionFailedParams{
			ID:          parsedID,
			ProviderRef: providerRef,
		})
	}

	if err != nil {
		// Có thể đã xử lý rồi (idempotent), log nhưng không báo lỗi fatal
		s.log.Warn("finalize transaction: update returned no rows (possibly duplicate webhook)",
			"txn_id", txnID, "err", err)
		return nil
	}

	if !success {
		s.log.Info("payment failed", "txn_id", txnID, "provider_ref", providerRef)
		return nil
	}

	// Tính thời hạn subscription mới
	duration, err := planToDuration(txn.Plan)
	if err != nil {
		return err
	}
	expiresAt := time.Now().Add(duration)

	// Cập nhật subscription
	if _, err := s.queries.UpdateSubscription(ctx, db.UpdateSubscriptionParams{
		UserID:    txn.UserID,
		Plan:      txn.Plan,
		ExpiresAt: expiresAt,
	}); err != nil {
		return fmt.Errorf("finalize: update subscription: %w", err)
	}

	// Enqueue email job
	if err := s.taskQueue.EnqueuePaymentSuccess(ctx, txn.UserID.String(), txn.Plan); err != nil {
		// Email không quan trọng bằng thanh toán — chỉ log, không fail
		s.log.Error("enqueue payment_success email failed", "user_id", txn.UserID, "err", err)
	}

	s.log.Info("payment success — subscription updated",
		"txn_id", txnID, "user_id", txn.UserID,
		"plan", txn.Plan, "expires_at", expiresAt)

	return nil
}

// GetPaymentHistory trả danh sách giao dịch có pagination.
func (s *PaymentService) GetPaymentHistory(ctx context.Context, userID uuid.UUID, page, pageSize int32) ([]db.PaymentTransaction, int64, error) {
	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 20
	}

	offset := (page - 1) * pageSize

	txns, err := s.queries.ListPaymentTransactionsByUser(ctx, db.ListPaymentTransactionsByUserParams{
		UserID: userID,
		Limit:  pageSize,
		Offset: offset,
	})
	if err != nil {
		return nil, 0, fmt.Errorf("payment history: list: %w", err)
	}

	total, err := s.queries.CountPaymentTransactionsByUser(ctx, userID)
	if err != nil {
		return nil, 0, fmt.Errorf("payment history: count: %w", err)
	}

	return txns, total, nil
}

// ----------- helpers -----------

func planToAmount(plan string) (int64, error) {
	switch plan {
	case "weekly":
		return PriceWeekly, nil
	case "monthly":
		return PriceMonthly, nil
	default:
		return 0, fmt.Errorf("unknown plan: %q", plan)
	}
}

func planToDuration(plan string) (time.Duration, error) {
	switch plan {
	case "weekly":
		return DurationWeekly, nil
	case "monthly":
		return DurationMonthly, nil
	default:
		return 0, fmt.Errorf("unknown plan: %q", plan)
	}
}
