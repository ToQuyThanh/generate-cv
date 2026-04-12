package payment_test

import (
	"net/url"
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/yourname/generate-cv/pkg/payment"
)

// cfg dùng chung cho mọi test case — giá trị sandbox VNPay.
var vnpayCfg = payment.VNPayConfig{
	TmnCode:    "TESTCODE",
	HashSecret: "supersecretkey123",
	PaymentURL: "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html",
	ReturnURL:  "https://example.com/payment/vnpay/callback",
	IPNURL:     "https://example.com/webhook/vnpay",
}

func newVNPay() *payment.VNPayProvider {
	return payment.NewVNPayProvider(vnpayCfg)
}

// ─────────────────────────────────────────────
//  CreatePaymentURL
// ─────────────────────────────────────────────

func TestVNPay_CreatePaymentURL_ContainsRequiredParams(t *testing.T) {
	v := newVNPay()
	rawURL := v.CreatePaymentURL("txn-uuid-001", 49_000, "Generate CV - Gói weekly", "127.0.0.1")

	parsed, err := url.Parse(rawURL)
	require.NoError(t, err)

	q := parsed.Query()

	assert.Equal(t, "2.1.0", q.Get("vnp_Version"))
	assert.Equal(t, "pay", q.Get("vnp_Command"))
	assert.Equal(t, vnpayCfg.TmnCode, q.Get("vnp_TmnCode"))
	assert.Equal(t, "4900000", q.Get("vnp_Amount")) // 49_000 × 100
	assert.Equal(t, "txn-uuid-001", q.Get("vnp_TxnRef"))
	assert.Equal(t, "VND", q.Get("vnp_CurrCode"))
	assert.Equal(t, vnpayCfg.ReturnURL, q.Get("vnp_ReturnUrl"))
	assert.NotEmpty(t, q.Get("vnp_SecureHash"))
	assert.NotEmpty(t, q.Get("vnp_CreateDate"))
	assert.NotEmpty(t, q.Get("vnp_ExpireDate"))
}

func TestVNPay_CreatePaymentURL_StartsWithGatewayURL(t *testing.T) {
	v := newVNPay()
	rawURL := v.CreatePaymentURL("txn-uuid-002", 149_000, "Gói monthly", "10.0.0.1")
	assert.True(t, strings.HasPrefix(rawURL, vnpayCfg.PaymentURL))
}

func TestVNPay_CreatePaymentURL_AmountMultiplied100(t *testing.T) {
	v := newVNPay()
	rawURL := v.CreatePaymentURL("txn-uuid-003", 149_000, "test", "127.0.0.1")
	parsed, _ := url.Parse(rawURL)
	assert.Equal(t, "14900000", parsed.Query().Get("vnp_Amount"))
}

// ─────────────────────────────────────────────
//  VerifyWebhook
// ─────────────────────────────────────────────

// buildCallbackParams tạo params giả lập callback từ VNPay và ký đúng.
func buildCallbackParams(v *payment.VNPayProvider, txnRef, responseCode, transactionStatus string) url.Values {
	// Tạo URL hợp lệ rồi lấy query params (đã có SecureHash đúng)
	rawURL := v.CreatePaymentURL(txnRef, 49_000, "test", "127.0.0.1")
	parsed, _ := url.Parse(rawURL)
	params := parsed.Query()

	// Override thêm các trường VNPay callback bổ sung
	params.Set("vnp_ResponseCode", responseCode)
	params.Set("vnp_TransactionStatus", transactionStatus)
	params.Set("vnp_TransactionNo", "VNP123456789")

	// Ký lại vì đã thêm params mới
	// (trong thực tế VNPay ký toàn bộ; ở đây ta dùng internal method qua helper)
	return params
}

func TestVNPay_VerifyWebhook_ValidSignature(t *testing.T) {
	v := newVNPay()

	// Tạo URL hợp lệ → lấy params đã ký đúng
	rawURL := v.CreatePaymentURL("txn-verify-ok", 49_000, "test", "127.0.0.1")
	parsed, _ := url.Parse(rawURL)
	params := parsed.Query()

	assert.True(t, v.VerifyWebhook(params), "signature hợp lệ phải pass")
}

func TestVNPay_VerifyWebhook_TamperedParam(t *testing.T) {
	v := newVNPay()

	rawURL := v.CreatePaymentURL("txn-tampered", 49_000, "test", "127.0.0.1")
	parsed, _ := url.Parse(rawURL)
	params := parsed.Query()

	// Giả mạo số tiền sau khi ký
	params.Set("vnp_Amount", "999999900")

	assert.False(t, v.VerifyWebhook(params), "signature sai sau khi tamper phải fail")
}

func TestVNPay_VerifyWebhook_MissingSecureHash(t *testing.T) {
	v := newVNPay()
	params := url.Values{}
	params.Set("vnp_TxnRef", "abc")
	// Không có vnp_SecureHash

	assert.False(t, v.VerifyWebhook(params))
}

func TestVNPay_VerifyWebhook_EmptyParams(t *testing.T) {
	v := newVNPay()
	assert.False(t, v.VerifyWebhook(url.Values{}))
}

// ─────────────────────────────────────────────
//  IsVNPaySuccess
// ─────────────────────────────────────────────

func TestIsVNPaySuccess_BothCodeSuccess(t *testing.T) {
	params := url.Values{}
	params.Set("vnp_ResponseCode", "00")
	params.Set("vnp_TransactionStatus", "00")
	assert.True(t, payment.IsVNPaySuccess(params))
}

func TestIsVNPaySuccess_ResponseCodeFailed(t *testing.T) {
	params := url.Values{}
	params.Set("vnp_ResponseCode", "24") // cancelled by user
	params.Set("vnp_TransactionStatus", "00")
	assert.False(t, payment.IsVNPaySuccess(params))
}

func TestIsVNPaySuccess_TransactionStatusFailed(t *testing.T) {
	params := url.Values{}
	params.Set("vnp_ResponseCode", "00")
	params.Set("vnp_TransactionStatus", "02") // pending
	assert.False(t, payment.IsVNPaySuccess(params))
}

// ─────────────────────────────────────────────
//  ExtractVNPayInfo
// ─────────────────────────────────────────────

func TestExtractVNPayInfo(t *testing.T) {
	params := url.Values{}
	params.Set("vnp_TxnRef", "my-txn-uuid")
	params.Set("vnp_TransactionNo", "VNP987654")

	txnRef, transactionNo := payment.ExtractVNPayInfo(params)
	assert.Equal(t, "my-txn-uuid", txnRef)
	assert.Equal(t, "VNP987654", transactionNo)
}

// ─────────────────────────────────────────────
//  DifferentSecrets produce different signatures
// ─────────────────────────────────────────────

func TestVNPay_DifferentSecrets_DifferentSignatures(t *testing.T) {
	v1 := payment.NewVNPayProvider(payment.VNPayConfig{
		TmnCode: "CODE", HashSecret: "secret-A",
		PaymentURL: "https://example.com", ReturnURL: "https://example.com/cb",
	})
	v2 := payment.NewVNPayProvider(payment.VNPayConfig{
		TmnCode: "CODE", HashSecret: "secret-B",
		PaymentURL: "https://example.com", ReturnURL: "https://example.com/cb",
	})

	url1 := v1.CreatePaymentURL("txn-1", 49_000, "test", "127.0.0.1")
	url2 := v2.CreatePaymentURL("txn-1", 49_000, "test", "127.0.0.1")

	p1, _ := url.Parse(url1)
	p2, _ := url.Parse(url2)

	assert.NotEqual(t,
		p1.Query().Get("vnp_SecureHash"),
		p2.Query().Get("vnp_SecureHash"),
		"các secret khác nhau phải tạo signature khác nhau",
	)
}
