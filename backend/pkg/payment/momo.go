package payment

import (
	"bytes"
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"
)

// MoMoConfig giữ toàn bộ cấu hình MoMo.
type MoMoConfig struct {
	PartnerCode string // mã đối tác (MOMOBKUN20180529 cho sandbox)
	AccessKey   string // access key từ MoMo developer portal
	SecretKey   string // secret key để ký HMAC
	APIURL      string // https://test-payment.momo.vn/v2/gateway/api/create
	RedirectURL string // URL redirect về sau thanh toán
	IPNURL      string // URL nhận IPN
}

// MoMoProvider xử lý tạo link thanh toán và xác thực webhook MoMo.
type MoMoProvider struct {
	cfg    MoMoConfig
	client *http.Client
}

// NewMoMoProvider tạo provider với HTTP client timeout 10 giây.
func NewMoMoProvider(cfg MoMoConfig) *MoMoProvider {
	return &MoMoProvider{
		cfg:    cfg,
		client: &http.Client{Timeout: 10 * time.Second},
	}
}

// momoCreateRequest là body gửi tới MoMo API.
type momoCreateRequest struct {
	PartnerCode  string `json:"partnerCode"`
	PartnerName  string `json:"partnerName"`
	StoreID      string `json:"storeId"`
	RequestType  string `json:"requestType"`
	IpnURL       string `json:"ipnUrl"`
	RedirectURL  string `json:"redirectUrl"`
	OrderID      string `json:"orderId"`
	Amount       int64  `json:"amount"`
	Lang         string `json:"lang"`
	AutoCapture  bool   `json:"autoCapture"`
	OrderInfo    string `json:"orderInfo"`
	RequestID    string `json:"requestId"`
	ExtraData    string `json:"extraData"`
	Signature    string `json:"signature"`
}

// MoMoCreateResponse là response từ MoMo API.
type MoMoCreateResponse struct {
	PartnerCode  string `json:"partnerCode"`
	RequestID    string `json:"requestId"`
	OrderID      string `json:"orderId"`
	Amount       int64  `json:"amount"`
	ResponseTime int64  `json:"responseTime"`
	Message      string `json:"message"`
	ResultCode   int    `json:"resultCode"`
	PayURL       string `json:"payUrl"`
	ShortLink    string `json:"shortLink"`
}

// CreatePaymentURL gọi MoMo API để tạo link thanh toán.
//
//   - txnID: UUID của payment_transaction trong DB (dùng làm orderId + requestId)
//   - amountVND: số tiền (VND)
//   - orderInfo: mô tả đơn hàng
func (m *MoMoProvider) CreatePaymentURL(ctx context.Context, txnID string, amountVND int64, orderInfo string) (*MoMoCreateResponse, error) {
	// Build raw signature string theo spec MoMo v2
	rawSig := fmt.Sprintf(
		"accessKey=%s&amount=%d&extraData=&ipnUrl=%s&orderId=%s&orderInfo=%s&partnerCode=%s&redirectUrl=%s&requestId=%s&requestType=captureWallet",
		m.cfg.AccessKey, amountVND, m.cfg.IPNURL, txnID, orderInfo, m.cfg.PartnerCode, m.cfg.RedirectURL, txnID,
	)
	signature := m.sign(rawSig)

	body := momoCreateRequest{
		PartnerCode: m.cfg.PartnerCode,
		PartnerName: "Generate CV",
		StoreID:     "GenerateCVStore",
		RequestType: "captureWallet",
		IpnURL:      m.cfg.IPNURL,
		RedirectURL: m.cfg.RedirectURL,
		OrderID:     txnID,
		Amount:      amountVND,
		Lang:        "vi",
		AutoCapture: true,
		OrderInfo:   orderInfo,
		RequestID:   txnID,
		ExtraData:   "",
		Signature:   signature,
	}

	bodyJSON, err := json.Marshal(body)
	if err != nil {
		return nil, fmt.Errorf("momo: marshal request: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, m.cfg.APIURL, bytes.NewReader(bodyJSON))
	if err != nil {
		return nil, fmt.Errorf("momo: new request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := m.client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("momo: do request: %w", err)
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("momo: read response: %w", err)
	}

	var result MoMoCreateResponse
	if err := json.Unmarshal(respBody, &result); err != nil {
		return nil, fmt.Errorf("momo: unmarshal response: %w", err)
	}

	if result.ResultCode != 0 {
		return nil, fmt.Errorf("momo: create payment failed (code %d): %s", result.ResultCode, result.Message)
	}

	return &result, nil
}

// MoMoIPNPayload là body POST từ MoMo IPN.
type MoMoIPNPayload struct {
	PartnerCode  string `json:"partnerCode"`
	OrderID      string `json:"orderId"`      // = txnID trong DB
	RequestID    string `json:"requestId"`
	Amount       int64  `json:"amount"`
	OrderInfo    string `json:"orderInfo"`
	OrderType    string `json:"orderType"`
	TransID      int64  `json:"transId"`      // mã giao dịch MoMo (provider_ref)
	ResultCode   int    `json:"resultCode"`   // 0 = thành công
	Message      string `json:"message"`
	PayType      string `json:"payType"`
	ResponseTime int64  `json:"responseTime"`
	ExtraData    string `json:"extraData"`
	Signature    string `json:"signature"`
}

// VerifyIPN xác thực chữ ký HMAC-SHA256 của MoMo IPN payload.
func (m *MoMoProvider) VerifyIPN(p *MoMoIPNPayload) bool {
	rawSig := fmt.Sprintf(
		"accessKey=%s&amount=%d&extraData=%s&message=%s&orderId=%s&orderInfo=%s&orderType=%s&partnerCode=%s&payType=%s&requestId=%s&responseTime=%d&resultCode=%d&transId=%d",
		m.cfg.AccessKey, p.Amount, p.ExtraData, p.Message, p.OrderID, p.OrderInfo,
		p.OrderType, p.PartnerCode, p.PayType, p.RequestID, p.ResponseTime, p.ResultCode, p.TransID,
	)
	expected := m.sign(rawSig)
	return hmac.Equal([]byte(expected), []byte(p.Signature))
}

// IsSuccess kiểm tra IPN payload thanh toán thành công.
func (m *MoMoProvider) IsSuccess(p *MoMoIPNPayload) bool {
	return p.ResultCode == 0
}

// sign tính HMAC-SHA256 với SecretKey.
func (m *MoMoProvider) sign(rawData string) string {
	mac := hmac.New(sha256.New, []byte(m.cfg.SecretKey))
	mac.Write([]byte(rawData))
	return hex.EncodeToString(mac.Sum(nil))
}
