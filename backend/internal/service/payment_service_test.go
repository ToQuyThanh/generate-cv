package service_test

import (
	"context"
	"errors"
	"log/slog"
	"net/url"
	"os"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"
	db "github.com/yourname/generate-cv/db/sqlc"
	"github.com/yourname/generate-cv/internal/service"
	"github.com/yourname/generate-cv/pkg/payment"
)

// ─────────────────────────────────────────────
//  Mock: DB Queries
// ─────────────────────────────────────────────

type mockQueries struct{ mock.Mock }

func (m *mockQueries) CreatePaymentTransaction(ctx context.Context, p db.CreatePaymentTransactionParams) (db.PaymentTransaction, error) {
	args := m.Called(ctx, p)
	return args.Get(0).(db.PaymentTransaction), args.Error(1)
}
func (m *mockQueries) UpdatePaymentTransactionSuccess(ctx context.Context, p db.UpdatePaymentTransactionSuccessParams) (db.PaymentTransaction, error) {
	args := m.Called(ctx, p)
	return args.Get(0).(db.PaymentTransaction), args.Error(1)
}
func (m *mockQueries) UpdatePaymentTransactionFailed(ctx context.Context, p db.UpdatePaymentTransactionFailedParams) (db.PaymentTransaction, error) {
	args := m.Called(ctx, p)
	return args.Get(0).(db.PaymentTransaction), args.Error(1)
}
func (m *mockQueries) UpdateSubscription(ctx context.Context, p db.UpdateSubscriptionParams) (db.Subscription, error) {
	args := m.Called(ctx, p)
	return args.Get(0).(db.Subscription), args.Error(1)
}
func (m *mockQueries) ListPaymentTransactionsByUser(ctx context.Context, p db.ListPaymentTransactionsByUserParams) ([]db.PaymentTransaction, error) {
	args := m.Called(ctx, p)
	return args.Get(0).([]db.PaymentTransaction), args.Error(1)
}
func (m *mockQueries) CountPaymentTransactionsByUser(ctx context.Context, userID uuid.UUID) (int64, error) {
	args := m.Called(ctx, userID)
	return args.Get(0).(int64), args.Error(1)
}

// ─────────────────────────────────────────────
//  Mock: Enqueuer
// ─────────────────────────────────────────────

type mockEnqueuer struct{ mock.Mock }

func (m *mockEnqueuer) EnqueuePaymentSuccess(ctx context.Context, userID, plan string) error {
	return m.Called(ctx, userID, plan).Error(0)
}

// ─────────────────────────────────────────────
//  Helpers
// ─────────────────────────────────────────────

var testLogger = slog.New(slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelDebug}))

var vnpayCfg = payment.VNPayConfig{
	TmnCode: "TEST", HashSecret: "secret",
	PaymentURL: "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html",
	ReturnURL:  "https://example.com/cb", IPNURL: "https://example.com/ipn",
}

func newSvc(q *mockQueries, enq *mockEnqueuer) *service.PaymentService {
	vnpay := payment.NewVNPayProvider(vnpayCfg)
	// MoMo không cần gọi API thật trong các test dưới (dùng VNPay path hoặc mock)
	momo := payment.NewMoMoProvider(payment.MoMoConfig{
		PartnerCode: "MOMO", AccessKey: "ak", SecretKey: "sk",
		APIURL: "http://localhost:19999", RedirectURL: "https://example.com/result",
		IPNURL: "https://example.com/webhook/momo",
	})
	return service.NewPaymentService(q, vnpay, momo, enq, testLogger)
}

// ─────────────────────────────────────────────
//  CreatePayment
// ─────────────────────────────────────────────

func TestCreatePayment_VNPay_Weekly_ReturnsURL(t *testing.T) {
	q := &mockQueries{}
	enq := &mockEnqueuer{}
	svc := newSvc(q, enq)

	userID := uuid.New()
	txnID := uuid.New()

	q.On("CreatePaymentTransaction", mock.Anything, db.CreatePaymentTransactionParams{
		UserID:    userID,
		Plan:      "weekly",
		Method:    "vnpay",
		AmountVnd: 49_000,
	}).Return(db.PaymentTransaction{
		ID:        txnID,
		UserID:    userID,
		Plan:      "weekly",
		Method:    "vnpay",
		AmountVnd: 49_000,
		Status:    "pending",
	}, nil)

	resp, err := svc.CreatePayment(context.Background(), service.CreatePaymentRequest{
		UserID:   userID,
		Plan:     "weekly",
		Method:   "vnpay",
		ClientIP: "127.0.0.1",
	})

	require.NoError(t, err)
	assert.Equal(t, txnID.String(), resp.TransactionID)
	assert.Contains(t, resp.PaymentURL, "sandbox.vnpayment.vn")
	assert.Contains(t, resp.PaymentURL, txnID.String())
	q.AssertExpectations(t)
}

func TestCreatePayment_UnknownPlan_ReturnsError(t *testing.T) {
	svc := newSvc(&mockQueries{}, &mockEnqueuer{})
	_, err := svc.CreatePayment(context.Background(), service.CreatePaymentRequest{
		UserID: uuid.New(), Plan: "yearly", Method: "vnpay", ClientIP: "127.0.0.1",
	})
	assert.ErrorContains(t, err, "yearly")
}

func TestCreatePayment_UnknownMethod_ReturnsError(t *testing.T) {
	q := &mockQueries{}
	q.On("CreatePaymentTransaction", mock.Anything, mock.Anything).
		Return(db.PaymentTransaction{ID: uuid.New(), Plan: "weekly", Method: "stripe", AmountVnd: 49_000}, nil)

	svc := newSvc(q, &mockEnqueuer{})
	_, err := svc.CreatePayment(context.Background(), service.CreatePaymentRequest{
		UserID: uuid.New(), Plan: "weekly", Method: "stripe", ClientIP: "127.0.0.1",
	})
	assert.ErrorContains(t, err, "stripe")
}

func TestCreatePayment_DBError_ReturnsError(t *testing.T) {
	q := &mockQueries{}
	q.On("CreatePaymentTransaction", mock.Anything, mock.Anything).
		Return(db.PaymentTransaction{}, errors.New("db connection refused"))

	svc := newSvc(q, &mockEnqueuer{})
	_, err := svc.CreatePayment(context.Background(), service.CreatePaymentRequest{
		UserID: uuid.New(), Plan: "monthly", Method: "vnpay", ClientIP: "127.0.0.1",
	})
	assert.Error(t, err)
}

// ─────────────────────────────────────────────
//  HandleVNPayWebhook
// ─────────────────────────────────────────────

func buildVNPayParams(svc *service.PaymentService, txnID string, success bool) url.Values {
	// Tạo URL hợp lệ từ VNPay provider để lấy params đã ký đúng
	v := payment.NewVNPayProvider(vnpayCfg)
	rawURL := v.CreatePaymentURL(txnID, 49_000, "test", "127.0.0.1")
	parsed, _ := url.Parse(rawURL)
	params := parsed.Query()

	if success {
		params.Set("vnp_ResponseCode", "00")
		params.Set("vnp_TransactionStatus", "00")
	} else {
		params.Set("vnp_ResponseCode", "24")
		params.Set("vnp_TransactionStatus", "02")
	}
	params.Set("vnp_TransactionNo", "VNP000111222")
	return params
}

func TestHandleVNPayWebhook_Success_UpdatesSubscription(t *testing.T) {
	q := &mockQueries{}
	enq := &mockEnqueuer{}
	svc := newSvc(q, enq)

	txnID := uuid.New()
	userID := uuid.New()

	q.On("UpdatePaymentTransactionSuccess", mock.Anything, mock.MatchedBy(func(p db.UpdatePaymentTransactionSuccessParams) bool {
		return p.ID == txnID
	})).Return(db.PaymentTransaction{
		ID:        txnID,
		UserID:    userID,
		Plan:      "weekly",
		AmountVnd: 49_000,
		Status:    "success",
	}, nil)

	q.On("UpdateSubscription", mock.Anything, mock.MatchedBy(func(p db.UpdateSubscriptionParams) bool {
		return p.UserID == userID && p.Plan == "weekly" && p.ExpiresAt.After(time.Now())
	})).Return(db.Subscription{}, nil)

	enq.On("EnqueuePaymentSuccess", mock.Anything, userID.String(), "weekly").Return(nil)

	// Params hợp lệ với signature đúng (nhưng ta cần bypass signature trong test này)
	// Vì HandleVNPayWebhook sẽ call VerifyWebhook, ta dùng params đã ký đúng từ CreatePaymentURL
	params := buildVNPayParams(svc, txnID.String(), true)

	err := svc.HandleVNPayWebhook(context.Background(), params)
	require.NoError(t, err)

	q.AssertExpectations(t)
	enq.AssertExpectations(t)
}

func TestHandleVNPayWebhook_Failed_DoesNotUpdateSubscription(t *testing.T) {
	q := &mockQueries{}
	svc := newSvc(q, &mockEnqueuer{})

	txnID := uuid.New()
	userID := uuid.New()

	q.On("UpdatePaymentTransactionFailed", mock.Anything, mock.MatchedBy(func(p db.UpdatePaymentTransactionFailedParams) bool {
		return p.ID == txnID
	})).Return(db.PaymentTransaction{
		ID: txnID, UserID: userID, Plan: "weekly", Status: "failed",
	}, nil)

	params := buildVNPayParams(svc, txnID.String(), false)
	err := svc.HandleVNPayWebhook(context.Background(), params)
	require.NoError(t, err)

	// UpdateSubscription không được gọi
	q.AssertNotCalled(t, "UpdateSubscription", mock.Anything, mock.Anything)
}

func TestHandleVNPayWebhook_InvalidSignature_ReturnsError(t *testing.T) {
	svc := newSvc(&mockQueries{}, &mockEnqueuer{})

	params := url.Values{}
	params.Set("vnp_TxnRef", uuid.New().String())
	params.Set("vnp_SecureHash", "invalidsignature")

	err := svc.HandleVNPayWebhook(context.Background(), params)
	assert.ErrorContains(t, err, "invalid signature")
}

// ─────────────────────────────────────────────
//  HandleMoMoWebhook
// ─────────────────────────────────────────────

func TestHandleMoMoWebhook_InvalidSignature_ReturnsError(t *testing.T) {
	svc := newSvc(&mockQueries{}, &mockEnqueuer{})
	payload := &payment.MoMoIPNPayload{
		PartnerCode: "MOMO",
		OrderID:     uuid.New().String(),
		ResultCode:  0,
		Signature:   "wrong-signature",
	}
	err := svc.HandleMoMoWebhook(context.Background(), payload)
	assert.ErrorContains(t, err, "invalid signature")
}

// ─────────────────────────────────────────────
//  GetPaymentHistory
// ─────────────────────────────────────────────

func TestGetPaymentHistory_ReturnsPaginatedResults(t *testing.T) {
	q := &mockQueries{}
	svc := newSvc(q, &mockEnqueuer{})
	userID := uuid.New()

	expectedTxns := []db.PaymentTransaction{
		{ID: uuid.New(), UserID: userID, Plan: "weekly", Status: "success"},
		{ID: uuid.New(), UserID: userID, Plan: "monthly", Status: "failed"},
	}

	q.On("ListPaymentTransactionsByUser", mock.Anything, db.ListPaymentTransactionsByUserParams{
		UserID: userID, Limit: 20, Offset: 0,
	}).Return(expectedTxns, nil)

	q.On("CountPaymentTransactionsByUser", mock.Anything, userID).Return(int64(2), nil)

	txns, total, err := svc.GetPaymentHistory(context.Background(), userID, 1, 20)

	require.NoError(t, err)
	assert.Equal(t, int64(2), total)
	assert.Len(t, txns, 2)
	q.AssertExpectations(t)
}

func TestGetPaymentHistory_InvalidPageDefaults(t *testing.T) {
	q := &mockQueries{}
	svc := newSvc(q, &mockEnqueuer{})
	userID := uuid.New()

	// page=0 và pageSize=200 phải được normalize về 1 và 20
	q.On("ListPaymentTransactionsByUser", mock.Anything, db.ListPaymentTransactionsByUserParams{
		UserID: userID, Limit: 20, Offset: 0,
	}).Return([]db.PaymentTransaction{}, nil)
	q.On("CountPaymentTransactionsByUser", mock.Anything, userID).Return(int64(0), nil)

	_, _, err := svc.GetPaymentHistory(context.Background(), userID, 0, 200)
	require.NoError(t, err)
	q.AssertExpectations(t)
}
