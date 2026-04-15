package payment

import (
	"crypto/hmac"
	"crypto/sha512"
	"encoding/hex"
	"fmt"
	"net/url"
	"sort"
	"strings"
	"time"
)

// VNPayConfig giữ toàn bộ cấu hình VNPay.
type VNPayConfig struct {
	TmnCode    string // mã website tại VNPay
	HashSecret string // chuỗi bí mật để ký HMAC
	PaymentURL string // URL cổng thanh toán (sandbox hoặc production)
	ReturnURL  string // URL redirect về sau thanh toán
	IPNURL     string // URL nhận IPN (server-to-server notify)
}

// VNPayProvider xử lý tạo URL và xác thực webhook VNPay.
type VNPayProvider struct {
	cfg VNPayConfig
}

// NewVNPayProvider tạo provider mới từ config.
func NewVNPayProvider(cfg VNPayConfig) *VNPayProvider {
	return &VNPayProvider{cfg: cfg}
}

// CreatePaymentURL tạo URL thanh toán VNPay đã ký HMAC-SHA512.
//
//   - txnID: UUID của payment_transaction trong DB
//   - amountVND: số tiền (VND) — VNPay nhân thêm 100 nên truyền đúng số thật
//   - orderInfo: mô tả đơn hàng (hiển thị trên trang thanh toán)
//   - clientIP: IP người dùng (bắt buộc theo VNPay spec)
func (v *VNPayProvider) CreatePaymentURL(txnID string, amountVND int64, orderInfo, clientIP string) string {
	now := time.Now().In(time.FixedZone("Asia/Ho_Chi_Minh", 7*3600))

	params := url.Values{}
	params.Set("vnp_Version", "2.1.0")
	params.Set("vnp_Command", "pay")
	params.Set("vnp_TmnCode", v.cfg.TmnCode)
	params.Set("vnp_Amount", fmt.Sprintf("%d", amountVND*100)) // VNPay yêu cầu nhân 100
	params.Set("vnp_CurrCode", "VND")
	params.Set("vnp_TxnRef", txnID)                       // mã đơn hàng trong hệ thống của mình
	params.Set("vnp_OrderInfo", orderInfo)                 // mô tả tối đa 255 ký tự
	params.Set("vnp_OrderType", "other")                   // loại hàng hóa: other = dịch vụ
	params.Set("vnp_Locale", "vn")                         // ngôn ngữ trang thanh toán
	params.Set("vnp_ReturnUrl", v.cfg.ReturnURL)
	params.Set("vnp_IpAddr", clientIP)
	params.Set("vnp_CreateDate", now.Format("20060102150405"))  // yyyyMMddHHmmss
	params.Set("vnp_ExpireDate", now.Add(15*time.Minute).Format("20060102150405"))

	// Ký: sort keys → join thành query string → HMAC-SHA512
	signature := v.sign(params)
	params.Set("vnp_SecureHash", signature)

	return v.cfg.PaymentURL + "?" + params.Encode()
}

// VerifyWebhook xác thực chữ ký IPN / callback từ VNPay.
// Trả về true nếu signature hợp lệ.
func (v *VNPayProvider) VerifyWebhook(queryParams url.Values) bool {
	// Loại bỏ vnp_SecureHash và vnp_SecureHashType trước khi ký lại
	received := queryParams.Get("vnp_SecureHash")
	if received == "" {
		return false
	}

	filtered := url.Values{}
	for k, vals := range queryParams {
		if k == "vnp_SecureHash" || k == "vnp_SecureHashType" {
			continue
		}
		filtered[k] = vals
	}

	expected := v.sign(filtered)
	return hmac.Equal([]byte(expected), []byte(strings.ToLower(received)))
}

// IsSuccess kiểm tra mã phản hồi thanh toán thành công.
func IsVNPaySuccess(queryParams url.Values) bool {
	return queryParams.Get("vnp_ResponseCode") == "00" &&
		queryParams.Get("vnp_TransactionStatus") == "00"
}

// ExtractVNPayInfo trả về txnID (vnp_TxnRef) và provider_ref (vnp_TransactionNo).
func ExtractVNPayInfo(queryParams url.Values) (txnRef, transactionNo string) {
	return queryParams.Get("vnp_TxnRef"), queryParams.Get("vnp_TransactionNo")
}

// sign sắp xếp keys, ghép thành query string, ký HMAC-SHA512 với HashSecret.
func (v *VNPayProvider) sign(params url.Values) string {
	// Sort keys
	keys := make([]string, 0, len(params))
	for k := range params {
		keys = append(keys, k)
	}
	sort.Strings(keys)

	// Build query string không encode dấu +
	var sb strings.Builder
	for i, k := range keys {
		if i > 0 {
			sb.WriteByte('&')
		}
		sb.WriteString(k)
		sb.WriteByte('=')
		sb.WriteString(url.QueryEscape(params.Get(k)))
	}

	// HMAC-SHA512
	mac := hmac.New(sha512.New, []byte(v.cfg.HashSecret))
	mac.Write([]byte(sb.String()))
	return hex.EncodeToString(mac.Sum(nil))
}
