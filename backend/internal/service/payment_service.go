package service

import (
	"context"
	"fmt"
	"log/slog"
	"net/url"
	"time"

	"github.com/google/uuid"
	"github.com/yourname/generate-cv/internal/model"
	"github.com/yourname/generate-cv/internal/repository"
	"github.com/yourname/generate-cv/pkg/payment"
)

// ─── Pricing ──────────────────────────────────────────────────────────────────

const (
	PriceWeekly  int64 = 49_000
	PriceMonthly int64 = 149_000

	DurationWeekly  = 7 * 24 * time.Hour
	DurationMonthly = 30 * 24 * time.Hour
)

// ─── JobEnqueuer ──────────────────────────────────────────────────────────────

// JobEnqueuer abstracts background job enqueueing so PaymentService
// does not depend on any specific queue library (asynq, etc.).
type JobEnqueuer interface {
	EnqueuePaymentSuccess(ctx context.Context, userID, plan string) error
}

// ─── PaymentService ───────────────────────────────────────────────────────────

type PaymentService struct {
	payRepo  repository.PaymentRepo
	subRepo  repository.SubscriptionRepo
	vnpay    *payment.VNPayProvider
	momo     *payment.MoMoProvider
	enqueuer JobEnqueuer
	log      *slog.Logger
}

func NewPaymentService(
	payRepo repository.PaymentRepo,
	subRepo repository.SubscriptionRepo,
	vnpay *payment.VNPayProvider,
	momo *payment.MoMoProvider,
	enqueuer JobEnqueuer,
	log *slog.Logger,
) *PaymentService {
	return &PaymentService{
		payRepo:  payRepo,
		subRepo:  subRepo,
		vnpay:    vnpay,
		momo:     momo,
		enqueuer: enqueuer,
		log:      log,
	}
}

// ─── CreatePayment ────────────────────────────────────────────────────────────

// CreatePayment creates a pending transaction and returns a provider payment URL.
func (s *PaymentService) CreatePayment(ctx context.Context, userID uuid.UUID, req *model.CreatePaymentRequest, clientIP string) (*model.CreatePaymentResponse, error) {
	amount, err := planToAmount(req.Plan)
	if err != nil {
		return nil, err
	}

	txn, err := s.payRepo.Create(ctx, userID, req.Plan, req.Method, amount)
	if err != nil {
		return nil, fmt.Errorf("payment: create transaction: %w", err)
	}

	orderInfo := fmt.Sprintf("Generate CV - Goi %s", req.Plan)
	var payURL string

	switch req.Method {
	case "vnpay":
		payURL = s.vnpay.CreatePaymentURL(txn.ID.String(), amount, orderInfo, clientIP)

	case "momo":
		resp, err := s.momo.CreatePaymentURL(ctx, txn.ID.String(), amount, orderInfo)
		if err != nil {
			s.log.Error("momo create url failed", "txn_id", txn.ID, "err", err)
			return nil, fmt.Errorf("payment: momo: %w", err)
		}
		payURL = resp.PayURL

	default:
		return nil, fmt.Errorf("payment: unsupported method %q", req.Method)
	}

	s.log.Info("payment created", "txn_id", txn.ID, "plan", req.Plan, "method", req.Method)
	return &model.CreatePaymentResponse{
		TransactionID: txn.ID.String(),
		PaymentURL:    payURL,
	}, nil
}

// ─── VNPay ────────────────────────────────────────────────────────────────────

// HandleVNPayCallback processes the browser redirect (GET) from VNPay.
// Returns (success, txnID) so the handler can redirect the user.
func (s *PaymentService) HandleVNPayCallback(ctx context.Context, params url.Values) (success bool, txnID string, err error) {
	if !s.vnpay.VerifyWebhook(params) {
		return false, "", fmt.Errorf("vnpay callback: invalid signature")
	}
	txnRef, providerRef := payment.ExtractVNPayInfo(params)
	ok := payment.IsVNPaySuccess(params)
	if err := s.finalize(ctx, txnRef, providerRef, ok); err != nil {
		return false, txnRef, err
	}
	return ok, txnRef, nil
}

// HandleVNPayWebhook processes the server-to-server IPN (POST) from VNPay.
func (s *PaymentService) HandleVNPayWebhook(ctx context.Context, params url.Values) error {
	if !s.vnpay.VerifyWebhook(params) {
		return fmt.Errorf("vnpay webhook: invalid signature")
	}
	txnRef, providerRef := payment.ExtractVNPayInfo(params)
	return s.finalize(ctx, txnRef, providerRef, payment.IsVNPaySuccess(params))
}

// ─── MoMo ─────────────────────────────────────────────────────────────────────

// HandleMoMoWebhook processes the server-to-server IPN (POST) from MoMo.
func (s *PaymentService) HandleMoMoWebhook(ctx context.Context, payload *payment.MoMoIPNPayload) error {
	if !s.momo.VerifyIPN(payload) {
		return fmt.Errorf("momo webhook: invalid signature")
	}
	providerRef := fmt.Sprintf("%d", payload.TransID)
	return s.finalize(ctx, payload.OrderID, providerRef, s.momo.IsSuccess(payload))
}

// ─── History ──────────────────────────────────────────────────────────────────

// GetHistory returns paginated payment history for a user.
func (s *PaymentService) GetHistory(ctx context.Context, userID uuid.UUID, page, pageSize int) (*model.PaymentHistoryResponse, error) {
	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 20
	}
	offset := (page - 1) * pageSize

	txns, err := s.payRepo.List(ctx, userID, pageSize, offset)
	if err != nil {
		return nil, fmt.Errorf("payment history: list: %w", err)
	}

	total, err := s.payRepo.Count(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("payment history: count: %w", err)
	}

	items := make([]model.PaymentTransactionResponse, len(txns))
	for i, t := range txns {
		items[i] = model.PaymentTransactionResponse{
			ID:          t.ID,
			Plan:        t.Plan,
			Method:      t.Method,
			AmountVND:   t.AmountVND,
			Status:      t.Status,
			ProviderRef: t.ProviderRef,
			CreatedAt:   t.CreatedAt,
			PaidAt:      t.PaidAt,
		}
	}

	return &model.PaymentHistoryResponse{
		Data: items,
		Meta: model.PaginationMeta{Total: total, Page: page, PageSize: pageSize},
	}, nil
}

// ─── finalize (internal, idempotent) ─────────────────────────────────────────

func (s *PaymentService) finalize(ctx context.Context, txnIDStr, providerRef string, success bool) error {
	id, err := uuid.Parse(txnIDStr)
	if err != nil {
		return fmt.Errorf("finalize: invalid txn_id %q: %w", txnIDStr, err)
	}

	var txn *repository.PaymentTransaction

	if success {
		txn, err = s.payRepo.MarkSuccess(ctx, id, providerRef)
	} else {
		txn, err = s.payRepo.MarkFailed(ctx, id, providerRef)
	}

	if err != nil {
		// pgx.ErrNoRows means already processed — treat as idempotent, not an error.
		if repository.IsNotFound(err) {
			s.log.Warn("finalize: transaction already processed (duplicate webhook)", "txn_id", txnIDStr)
			return nil
		}
		return fmt.Errorf("finalize: update transaction: %w", err)
	}

	if !success {
		s.log.Info("payment failed", "txn_id", txnIDStr, "provider_ref", providerRef)
		return nil
	}

	// Upgrade subscription
	duration, _ := planToDuration(txn.Plan)
	expiresAt := time.Now().Add(duration)

	if _, err := s.subRepo.Upgrade(ctx, txn.UserID, txn.Plan, expiresAt); err != nil {
		return fmt.Errorf("finalize: upgrade subscription: %w", err)
	}

	// Enqueue email — non-fatal if it fails
	if err := s.enqueuer.EnqueuePaymentSuccess(ctx, txn.UserID.String(), txn.Plan); err != nil {
		s.log.Error("enqueue payment_success email failed", "user_id", txn.UserID, "err", err)
	}

	s.log.Info("payment success", "txn_id", txnIDStr, "user_id", txn.UserID, "plan", txn.Plan, "expires_at", expiresAt)
	return nil
}

// ─── helpers ──────────────────────────────────────────────────────────────────

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
