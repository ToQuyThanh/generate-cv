package service_test

import (
	"context"
	"fmt"
	"net/url"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/yourname/generate-cv/internal/model"
	"github.com/yourname/generate-cv/internal/repository"
	"github.com/yourname/generate-cv/internal/service"
	"github.com/yourname/generate-cv/pkg/payment"
)

// ─── Mock: PaymentRepo ────────────────────────────────────────────────────────

type mockPaymentRepo struct {
	txns       map[uuid.UUID]*repository.PaymentTransaction
	createErr  error
	markSuccErr error
	markFailErr error
}

func newMockPaymentRepo() *mockPaymentRepo {
	return &mockPaymentRepo{txns: make(map[uuid.UUID]*repository.PaymentTransaction)}
}

func (m *mockPaymentRepo) Create(_ context.Context, userID uuid.UUID, plan, method string, amountVND int64) (*repository.PaymentTransaction, error) {
	if m.createErr != nil {
		return nil, m.createErr
	}
	t := &repository.PaymentTransaction{
		ID:        uuid.New(),
		UserID:    userID,
		Plan:      plan,
		Method:    method,
		AmountVND: amountVND,
		Status:    "pending",
		CreatedAt: time.Now(),
	}
	m.txns[t.ID] = t
	return t, nil
}

func (m *mockPaymentRepo) GetByID(_ context.Context, id uuid.UUID) (*repository.PaymentTransaction, error) {
	t, ok := m.txns[id]
	if !ok {
		return nil, pgx.ErrNoRows
	}
	return t, nil
}

func (m *mockPaymentRepo) GetByProviderRef(_ context.Context, ref string) (*repository.PaymentTransaction, error) {
	for _, t := range m.txns {
		if t.ProviderRef != nil && *t.ProviderRef == ref {
			return t, nil
		}
	}
	return nil, pgx.ErrNoRows
}

func (m *mockPaymentRepo) MarkSuccess(_ context.Context, id uuid.UUID, providerRef string) (*repository.PaymentTransaction, error) {
	if m.markSuccErr != nil {
		return nil, m.markSuccErr
	}
	t, ok := m.txns[id]
	if !ok || t.Status != "pending" {
		return nil, pgx.ErrNoRows // idempotency
	}
	now := time.Now()
	t.Status = "success"
	t.ProviderRef = &providerRef
	t.PaidAt = &now
	return t, nil
}

func (m *mockPaymentRepo) MarkFailed(_ context.Context, id uuid.UUID, providerRef string) (*repository.PaymentTransaction, error) {
	if m.markFailErr != nil {
		return nil, m.markFailErr
	}
	t, ok := m.txns[id]
	if !ok || t.Status != "pending" {
		return nil, pgx.ErrNoRows
	}
	t.Status = "failed"
	t.ProviderRef = &providerRef
	return t, nil
}

func (m *mockPaymentRepo) List(_ context.Context, userID uuid.UUID, limit, offset int) ([]*repository.PaymentTransaction, error) {
	var result []*repository.PaymentTransaction
	for _, t := range m.txns {
		if t.UserID == userID {
			result = append(result, t)
		}
	}
	// simple slice pagination
	if offset >= len(result) {
		return nil, nil
	}
	end := offset + limit
	if end > len(result) {
		end = len(result)
	}
	return result[offset:end], nil
}

func (m *mockPaymentRepo) Count(_ context.Context, userID uuid.UUID) (int64, error) {
	var n int64
	for _, t := range m.txns {
		if t.UserID == userID {
			n++
		}
	}
	return n, nil
}

// ─── Mock: SubscriptionRepo ───────────────────────────────────────────────────

type mockSubRepo struct {
	upgraded   []uuid.UUID // tracks which users were upgraded
	upgradeErr error
}

func (m *mockSubRepo) Upgrade(_ context.Context, userID uuid.UUID, plan string, expiresAt time.Time) (*repository.Subscription, error) {
	if m.upgradeErr != nil {
		return nil, m.upgradeErr
	}
	m.upgraded = append(m.upgraded, userID)
	return &repository.Subscription{UserID: userID, Plan: plan, Status: "active", ExpiresAt: &expiresAt}, nil
}

func (m *mockSubRepo) ExpireAll(_ context.Context) ([]*repository.Subscription, error) {
	return nil, nil
}

// ─── Mock: JobEnqueuer ────────────────────────────────────────────────────────

type mockEnqueuer struct {
	calls    []string // userID values enqueued
	enqueueErr error
}

func (m *mockEnqueuer) EnqueuePaymentSuccess(_ context.Context, userID, plan string) error {
	if m.enqueueErr != nil {
		return m.enqueueErr
	}
	m.calls = append(m.calls, userID)
	return nil
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

var vnpayTestCfg = payment.VNPayConfig{
	TmnCode: "TESTCODE", HashSecret: "supersecretkey123",
	PaymentURL: "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html",
	ReturnURL:  "https://example.com/payment/vnpay/callback",
	IPNURL:     "https://example.com/webhook/vnpay",
}

var momoTestCfg = payment.MoMoConfig{
	PartnerCode: "MOMO", AccessKey: "ak", SecretKey: "sk",
	APIURL: "http://localhost:19999", // unreachable — tests that need MoMo use table-driven mocks
	RedirectURL: "https://example.com/result",
	IPNURL:      "https://example.com/webhook/momo",
}

func newTestSvc(payRepo repository.PaymentRepo, subRepo repository.SubscriptionRepo, enq service.JobEnqueuer) *service.PaymentService {
	return service.NewPaymentService(
		payRepo, subRepo,
		payment.NewVNPayProvider(vnpayTestCfg),
		payment.NewMoMoProvider(momoTestCfg),
		enq,
		nil, // logger — nil is fine for tests; service guards with log != nil before calling
	)
}

// buildSignedVNPayParams creates real HMAC-signed params to simulate VNPay webhook.
func buildSignedVNPayParams(txnID string, success bool) url.Values {
	v := payment.NewVNPayProvider(vnpayTestCfg)
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

// ─── Tests: CreatePayment ─────────────────────────────────────────────────────

func TestPayment_Create_VNPay_Weekly(t *testing.T) {
	payRepo := newMockPaymentRepo()
	subRepo := &mockSubRepo{}
	enq := &mockEnqueuer{}
	svc := newTestSvc(payRepo, subRepo, enq)

	resp, err := svc.CreatePayment(context.Background(), uuid.New(), &model.CreatePaymentRequest{
		Plan: "weekly", Method: "vnpay",
	}, "127.0.0.1")

	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if resp.PaymentURL == "" {
		t.Fatal("PaymentURL must not be empty")
	}
	if resp.TransactionID == "" {
		t.Fatal("TransactionID must not be empty")
	}
	// URL should point at VNPay gateway
	if !containsStr(resp.PaymentURL, "sandbox.vnpayment.vn") {
		t.Errorf("expected VNPay URL, got %s", resp.PaymentURL)
	}
}

func TestPayment_Create_Monthly_CorrectAmount(t *testing.T) {
	payRepo := newMockPaymentRepo()
	svc := newTestSvc(payRepo, &mockSubRepo{}, &mockEnqueuer{})

	_, err := svc.CreatePayment(context.Background(), uuid.New(), &model.CreatePaymentRequest{
		Plan: "monthly", Method: "vnpay",
	}, "127.0.0.1")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	// Check the created transaction has the right amount
	for _, txn := range payRepo.txns {
		if txn.AmountVND != 149_000 {
			t.Errorf("expected amount 149000, got %d", txn.AmountVND)
		}
	}
}

func TestPayment_Create_UnknownPlan_Error(t *testing.T) {
	svc := newTestSvc(newMockPaymentRepo(), &mockSubRepo{}, &mockEnqueuer{})
	_, err := svc.CreatePayment(context.Background(), uuid.New(), &model.CreatePaymentRequest{
		Plan: "yearly", Method: "vnpay",
	}, "127.0.0.1")
	if err == nil {
		t.Fatal("expected error for unknown plan")
	}
}

func TestPayment_Create_UnknownMethod_Error(t *testing.T) {
	svc := newTestSvc(newMockPaymentRepo(), &mockSubRepo{}, &mockEnqueuer{})
	_, err := svc.CreatePayment(context.Background(), uuid.New(), &model.CreatePaymentRequest{
		Plan: "weekly", Method: "stripe",
	}, "127.0.0.1")
	if err == nil {
		t.Fatal("expected error for unknown method")
	}
}

func TestPayment_Create_DBError_Propagates(t *testing.T) {
	payRepo := newMockPaymentRepo()
	payRepo.createErr = fmt.Errorf("db connection refused")
	svc := newTestSvc(payRepo, &mockSubRepo{}, &mockEnqueuer{})

	_, err := svc.CreatePayment(context.Background(), uuid.New(), &model.CreatePaymentRequest{
		Plan: "weekly", Method: "vnpay",
	}, "127.0.0.1")
	if err == nil {
		t.Fatal("expected error when DB fails")
	}
}

// ─── Tests: HandleVNPayWebhook ────────────────────────────────────────────────

func TestPayment_VNPayWebhook_Success_UpgradesSubscription(t *testing.T) {
	payRepo := newMockPaymentRepo()
	subRepo := &mockSubRepo{}
	enq := &mockEnqueuer{}
	svc := newTestSvc(payRepo, subRepo, enq)

	// Pre-create a pending transaction
	userID := uuid.New()
	txn, _ := payRepo.Create(context.Background(), userID, "weekly", "vnpay", 49_000)
	params := buildSignedVNPayParams(txn.ID.String(), true)

	if err := svc.HandleVNPayWebhook(context.Background(), params); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	// Subscription must be upgraded
	if len(subRepo.upgraded) != 1 || subRepo.upgraded[0] != userID {
		t.Error("subscription should have been upgraded for the user")
	}
	// Email job must be enqueued
	if len(enq.calls) != 1 {
		t.Error("payment success email should have been enqueued")
	}
	// Transaction must be marked success
	updated := payRepo.txns[txn.ID]
	if updated.Status != "success" {
		t.Errorf("expected status success, got %s", updated.Status)
	}
}

func TestPayment_VNPayWebhook_Failed_NoSubscriptionUpgrade(t *testing.T) {
	payRepo := newMockPaymentRepo()
	subRepo := &mockSubRepo{}
	enq := &mockEnqueuer{}
	svc := newTestSvc(payRepo, subRepo, enq)

	userID := uuid.New()
	txn, _ := payRepo.Create(context.Background(), userID, "weekly", "vnpay", 49_000)
	params := buildSignedVNPayParams(txn.ID.String(), false)

	if err := svc.HandleVNPayWebhook(context.Background(), params); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if len(subRepo.upgraded) != 0 {
		t.Error("subscription must NOT be upgraded on failed payment")
	}
	if len(enq.calls) != 0 {
		t.Error("email must NOT be enqueued on failed payment")
	}
	if payRepo.txns[txn.ID].Status != "failed" {
		t.Error("transaction should be marked failed")
	}
}

func TestPayment_VNPayWebhook_InvalidSignature_Error(t *testing.T) {
	svc := newTestSvc(newMockPaymentRepo(), &mockSubRepo{}, &mockEnqueuer{})

	params := url.Values{}
	params.Set("vnp_TxnRef", uuid.New().String())
	params.Set("vnp_SecureHash", "invalidsig")

	err := svc.HandleVNPayWebhook(context.Background(), params)
	if err == nil {
		t.Fatal("expected error for invalid signature")
	}
}

func TestPayment_VNPayWebhook_DuplicateWebhook_Idempotent(t *testing.T) {
	payRepo := newMockPaymentRepo()
	subRepo := &mockSubRepo{}
	enq := &mockEnqueuer{}
	svc := newTestSvc(payRepo, subRepo, enq)

	userID := uuid.New()
	txn, _ := payRepo.Create(context.Background(), userID, "weekly", "vnpay", 49_000)
	params := buildSignedVNPayParams(txn.ID.String(), true)

	// First call — should succeed
	if err := svc.HandleVNPayWebhook(context.Background(), params); err != nil {
		t.Fatalf("first call failed: %v", err)
	}
	// Second call — idempotent, must not error even though status != pending
	if err := svc.HandleVNPayWebhook(context.Background(), params); err != nil {
		t.Fatalf("duplicate webhook should be idempotent, got: %v", err)
	}
	// Subscription upgraded only once
	if len(subRepo.upgraded) != 1 {
		t.Errorf("subscription upgraded %d times, expected 1", len(subRepo.upgraded))
	}
}

// ─── Tests: HandleMoMoWebhook ─────────────────────────────────────────────────

func TestPayment_MoMoWebhook_InvalidSignature_Error(t *testing.T) {
	svc := newTestSvc(newMockPaymentRepo(), &mockSubRepo{}, &mockEnqueuer{})

	payload := &payment.MoMoIPNPayload{
		PartnerCode: "MOMO",
		OrderID:     uuid.New().String(),
		ResultCode:  0,
		Signature:   "wrong-signature",
	}
	if err := svc.HandleMoMoWebhook(context.Background(), payload); err == nil {
		t.Fatal("expected error for invalid MoMo signature")
	}
}

// ─── Tests: GetHistory ────────────────────────────────────────────────────────

func TestPayment_GetHistory_ReturnsItems(t *testing.T) {
	payRepo := newMockPaymentRepo()
	svc := newTestSvc(payRepo, &mockSubRepo{}, &mockEnqueuer{})
	userID := uuid.New()

	// Seed two transactions
	payRepo.Create(context.Background(), userID, "weekly", "vnpay", 49_000)
	payRepo.Create(context.Background(), userID, "monthly", "momo", 149_000)

	resp, err := svc.GetHistory(context.Background(), userID, 1, 20)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(resp.Data) != 2 {
		t.Errorf("expected 2 items, got %d", len(resp.Data))
	}
	if resp.Meta.Total != 2 {
		t.Errorf("expected total 2, got %d", resp.Meta.Total)
	}
}

func TestPayment_GetHistory_DefaultsInvalidPage(t *testing.T) {
	payRepo := newMockPaymentRepo()
	svc := newTestSvc(payRepo, &mockSubRepo{}, &mockEnqueuer{})
	userID := uuid.New()

	// page=0, pageSize=9999 should be normalized
	resp, err := svc.GetHistory(context.Background(), userID, 0, 9999)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if resp.Meta.Page != 1 {
		t.Errorf("expected page 1 after normalization, got %d", resp.Meta.Page)
	}
	if resp.Meta.PageSize != 20 {
		t.Errorf("expected page_size 20 after normalization, got %d", resp.Meta.PageSize)
	}
}

func TestPayment_GetHistory_EnqueueEmailFails_StillSuccess(t *testing.T) {
	payRepo := newMockPaymentRepo()
	subRepo := &mockSubRepo{}
	enq := &mockEnqueuer{enqueueErr: fmt.Errorf("redis down")}
	svc := newTestSvc(payRepo, subRepo, enq)

	userID := uuid.New()
	txn, _ := payRepo.Create(context.Background(), userID, "weekly", "vnpay", 49_000)
	params := buildSignedVNPayParams(txn.ID.String(), true)

	// Email enqueue failure must NOT fail the webhook
	if err := svc.HandleVNPayWebhook(context.Background(), params); err != nil {
		t.Fatalf("webhook should succeed even if email enqueue fails: %v", err)
	}
	// Subscription still upgraded
	if len(subRepo.upgraded) != 1 {
		t.Error("subscription should still be upgraded")
	}
}

// ─── helper ───────────────────────────────────────────────────────────────────

func containsStr(s, sub string) bool {
	return len(s) >= len(sub) && (s == sub || len(s) > 0 && findStr(s, sub))
}

func findStr(s, sub string) bool {
	for i := 0; i <= len(s)-len(sub); i++ {
		if s[i:i+len(sub)] == sub {
			return true
		}
	}
	return false
}
