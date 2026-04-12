package payment_test

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"
	
	// for test helper only, not used in production code
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/yourname/generate-cv/pkg/payment"
)

var momoCfg = payment.MoMoConfig{
	PartnerCode: "MOMO_PARTNER",
	AccessKey:   "momo-access-key",
	SecretKey:   "momo-secret-key-123",
	RedirectURL: "https://example.com/payment/result",
	IPNURL:      "https://example.com/webhook/momo",
}

func newMoMo(apiURL string) *payment.MoMoProvider {
	cfg := momoCfg
	cfg.APIURL = apiURL
	return payment.NewMoMoProvider(cfg)
}

// ─────────────────────────────────────────────
//  CreatePaymentURL — dùng mock HTTP server
// ─────────────────────────────────────────────

func TestMoMo_CreatePaymentURL_Success(t *testing.T) {
	// Mock MoMo API trả resultCode=0 + payUrl hợp lệ
	mockServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		assert.Equal(t, http.MethodPost, r.Method)
		assert.Equal(t, "application/json", r.Header.Get("Content-Type"))

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(payment.MoMoCreateResponse{
			PartnerCode: "MOMO_PARTNER",
			OrderID:     "test-txn-id",
			ResultCode:  0,
			Message:     "Successful.",
			PayURL:      "https://test-payment.momo.vn/pay/abc123",
			ShortLink:   "https://momo.vn/s/abc",
		})
	}))
	defer mockServer.Close()

	m := newMoMo(mockServer.URL)
	resp, err := m.CreatePaymentURL(context.Background(), "test-txn-id", 49_000, "Generate CV - Gói weekly")

	require.NoError(t, err)
	assert.Equal(t, 0, resp.ResultCode)
	assert.Equal(t, "https://test-payment.momo.vn/pay/abc123", resp.PayURL)
	assert.Equal(t, "test-txn-id", resp.OrderID)
}

func TestMoMo_CreatePaymentURL_MoMoError(t *testing.T) {
	// Mock MoMo API trả lỗi (resultCode != 0)
	mockServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(payment.MoMoCreateResponse{
			ResultCode: 1006, // transaction không tồn tại
			Message:    "Transaction not found",
		})
	}))
	defer mockServer.Close()

	m := newMoMo(mockServer.URL)
	resp, err := m.CreatePaymentURL(context.Background(), "bad-txn", 49_000, "test")

	assert.Nil(t, resp)
	assert.ErrorContains(t, err, "1006")
}

func TestMoMo_CreatePaymentURL_NetworkError(t *testing.T) {
	// URL không tồn tại → network error
	m := newMoMo("http://localhost:19999/nonexistent")
	resp, err := m.CreatePaymentURL(context.Background(), "txn-net-err", 49_000, "test")

	assert.Nil(t, resp)
	assert.Error(t, err)
}

func TestMoMo_CreatePaymentURL_InvalidJSON(t *testing.T) {
	mockServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Write([]byte("not-json{{"))
	}))
	defer mockServer.Close()

	m := newMoMo(mockServer.URL)
	resp, err := m.CreatePaymentURL(context.Background(), "txn-json-err", 49_000, "test")
	assert.Nil(t, resp)
	assert.Error(t, err)
}

// ─────────────────────────────────────────────
//  VerifyIPN
// ─────────────────────────────────────────────

// buildValidIPNPayload tạo payload hợp lệ có signature đúng.
// Vì sign() là private ta compute theo đúng raw string spec MoMo.
func buildValidIPNPayload(m *payment.MoMoProvider, orderID string, resultCode int, transID int64) *payment.MoMoIPNPayload {
	// Dựng payload trước
	p := &payment.MoMoIPNPayload{
		PartnerCode:  momoCfg.PartnerCode,
		OrderID:      orderID,
		RequestID:    orderID,
		Amount:       49_000,
		OrderInfo:    "Generate CV - Gói weekly",
		OrderType:    "momo_wallet",
		TransID:      transID,
		ResultCode:   resultCode,
		Message:      "Successful.",
		PayType:      "qr",
		ResponseTime: 1700000000000,
		ExtraData:    "",
	}

	// Tính signature theo cùng công thức trong momo.go
	rawSig := fmt.Sprintf(
		"accessKey=%s&amount=%d&extraData=%s&message=%s&orderId=%s&orderInfo=%s&orderType=%s&partnerCode=%s&payType=%s&requestId=%s&responseTime=%d&resultCode=%d&transId=%d",
		momoCfg.AccessKey, p.Amount, p.ExtraData, p.Message, p.OrderID, p.OrderInfo,
		p.OrderType, p.PartnerCode, p.PayType, p.RequestID, p.ResponseTime, p.ResultCode, p.TransID,
	)
	// Sử dụng exported helper để test signature (hoặc dùng reflect nếu private)
	// Ở đây ta dùng VerifyIPN: tạo payload có signature đúng bằng cách gọi sign qua hàm helper
	// Vì sign là private, ta dùng cách: gọi VerifyIPN với signature compute thủ công
	import_mac := computeHMACSHA256(momoCfg.SecretKey, rawSig)
	p.Signature = import_mac
	return p
}

func TestMoMo_VerifyIPN_ValidSignature(t *testing.T) {
	m := newMoMo("https://example.com")
	payload := buildValidIPNPayload(m, "order-verify-ok", 0, 987654321)
	assert.True(t, m.VerifyIPN(payload), "signature hợp lệ phải pass")
}

func TestMoMo_VerifyIPN_TamperedAmount(t *testing.T) {
	m := newMoMo("https://example.com")
	payload := buildValidIPNPayload(m, "order-tampered", 0, 111111)
	// Tamper amount sau khi đã tính signature
	payload.Amount = 1
	assert.False(t, m.VerifyIPN(payload), "signature sai sau khi tamper phải fail")
}

func TestMoMo_VerifyIPN_WrongSignature(t *testing.T) {
	m := newMoMo("https://example.com")
	payload := buildValidIPNPayload(m, "order-wrong-sig", 0, 222222)
	payload.Signature = "deadbeefdeadbeef"
	assert.False(t, m.VerifyIPN(payload))
}

func TestMoMo_VerifyIPN_EmptySignature(t *testing.T) {
	m := newMoMo("https://example.com")
	payload := buildValidIPNPayload(m, "order-empty-sig", 0, 333333)
	payload.Signature = ""
	assert.False(t, m.VerifyIPN(payload))
}

// ─────────────────────────────────────────────
//  IsSuccess
// ─────────────────────────────────────────────

func TestMoMo_IsSuccess_ResultCode0(t *testing.T) {
	m := newMoMo("https://example.com")
	p := &payment.MoMoIPNPayload{ResultCode: 0}
	assert.True(t, m.IsSuccess(p))
}

func TestMoMo_IsSuccess_NonZeroResultCode(t *testing.T) {
	m := newMoMo("https://example.com")
	for _, code := range []int{1000, 1006, 2019, 9000} {
		p := &payment.MoMoIPNPayload{ResultCode: code}
		assert.False(t, m.IsSuccess(p), "resultCode %d phải là failed", code)
	}
}

// ─────────────────────────────────────────────
//  Helpers (test-only)
// ─────────────────────────────────────────────
func computeHMACSHA256(secret, data string) string {
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write([]byte(data))
	return hex.EncodeToString(mac.Sum(nil))
}
