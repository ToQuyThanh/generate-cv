package handler

import (
	"encoding/json"
	"log/slog"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/yourname/generate-cv/internal/service"
	"github.com/yourname/generate-cv/pkg/payment"
)

// PaymentHandler xử lý các HTTP request liên quan đến thanh toán.
type PaymentHandler struct {
	svc *service.PaymentService
	log *slog.Logger
}

// NewPaymentHandler khởi tạo handler.
func NewPaymentHandler(svc *service.PaymentService, log *slog.Logger) *PaymentHandler {
	return &PaymentHandler{svc: svc, log: log}
}

// ─────────────────────────────────────────────
//  POST /payment/create
// ─────────────────────────────────────────────

type createPaymentRequest struct {
	Plan   string `json:"plan"   binding:"required,oneof=weekly monthly"`
	Method string `json:"method" binding:"required,oneof=vnpay momo"`
}

// Create tạo URL thanh toán cho user đang đăng nhập.
func (h *PaymentHandler) Create(c *gin.Context) {
	var req createPaymentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Lấy userID từ middleware AuthJWT
	userID, ok := getUserIDFromCtx(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	clientIP := c.ClientIP()

	resp, err := h.svc.CreatePayment(c.Request.Context(), service.CreatePaymentRequest{
		UserID:   userID,
		Plan:     req.Plan,
		Method:   req.Method,
		ClientIP: clientIP,
	})
	if err != nil {
		h.log.Error("create payment", "err", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "không thể tạo đơn thanh toán"})
		return
	}

	c.JSON(http.StatusOK, resp)
}

// ─────────────────────────────────────────────
//  GET /payment/vnpay/callback   (VNPay redirect về sau thanh toán)
// ─────────────────────────────────────────────

// VNPayCallback xử lý redirect từ VNPay, rồi redirect user về frontend.
func (h *PaymentHandler) VNPayCallback(c *gin.Context) {
	params := c.Request.URL.Query()

	success, txnID, err := h.svc.HandleVNPayCallback(c.Request.Context(), params)
	if err != nil {
		h.log.Error("vnpay callback", "err", err, "query", params.Encode())
		c.Redirect(http.StatusFound, "/payment/result?status=failed&reason=signature_invalid")
		return
	}

	status := "failed"
	if success {
		status = "success"
	}

	c.Redirect(http.StatusFound, "/payment/result?status="+status+"&txn="+txnID)
}

// ─────────────────────────────────────────────
//  POST /webhook/vnpay   (VNPay IPN server-to-server)
// ─────────────────────────────────────────────

// VNPayWebhook nhận IPN từ VNPay, phải trả về RspCode=00 nếu xử lý được.
func (h *PaymentHandler) VNPayWebhook(c *gin.Context) {
	params := c.Request.URL.Query()

	if err := h.svc.HandleVNPayWebhook(c.Request.Context(), params); err != nil {
		h.log.Error("vnpay webhook", "err", err)
		// VNPay yêu cầu JSON response với RspCode
		c.JSON(http.StatusOK, gin.H{
			"RspCode": "97", // sai chữ ký hoặc dữ liệu
			"Message": "Fail checksum",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"RspCode": "00",
		"Message": "Confirm Success",
	})
}

// ─────────────────────────────────────────────
//  POST /webhook/momo   (MoMo IPN server-to-server)
// ─────────────────────────────────────────────

// MoMoWebhook nhận IPN từ MoMo.
func (h *PaymentHandler) MoMoWebhook(c *gin.Context) {
	body, err := c.GetRawData()
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "cannot read body"})
		return
	}

	var payload payment.MoMoIPNPayload
	if err := json.Unmarshal(body, &payload); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid json"})
		return
	}

	if err := h.svc.HandleMoMoWebhook(c.Request.Context(), &payload); err != nil {
		h.log.Error("momo webhook", "err", err, "order_id", payload.OrderID)
		// MoMo chỉ cần HTTP 200 để dừng retry; không cần phân biệt lỗi
		c.JSON(http.StatusOK, gin.H{"message": "error"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "ok"})
}

// ─────────────────────────────────────────────
//  GET /payment/history
// ─────────────────────────────────────────────

// History trả danh sách giao dịch của user đang đăng nhập (có pagination).
func (h *PaymentHandler) History(c *gin.Context) {
	userID, ok := getUserIDFromCtx(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	page := queryInt32(c, "page", 1)
	pageSize := queryInt32(c, "page_size", 20)

	txns, total, err := h.svc.GetPaymentHistory(c.Request.Context(), userID, page, pageSize)
	if err != nil {
		h.log.Error("payment history", "err", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "không thể lấy lịch sử"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data": txns,
		"meta": gin.H{
			"total":     total,
			"page":      page,
			"page_size": pageSize,
		},
	})
}

// ─────────────────────────────────────────────
//  Helpers
// ─────────────────────────────────────────────

// getUserIDFromCtx lấy userID đã được middleware AuthJWT set vào context.
func getUserIDFromCtx(c *gin.Context) (uuid.UUID, bool) {
	val, exists := c.Get("userID")
	if !exists {
		return uuid.Nil, false
	}
	id, ok := val.(uuid.UUID)
	return id, ok
}

func queryInt32(c *gin.Context, key string, defaultVal int32) int32 {
    // Lấy string từ query
    vStr := c.DefaultQuery(key, "")
    if vStr == "" {
        return defaultVal
    }

    // Chuyển đổi sang int32
    var v int32
    _, err := fmt.Sscanf(vStr, "%d", &v)
    if err != nil {
        return defaultVal
    }
    return v
}
