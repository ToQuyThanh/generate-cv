package handler

import (
	"encoding/json"
	"log/slog"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/yourname/generate-cv/internal/model"
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
// Service signature: CreatePayment(ctx, userID uuid.UUID, req *model.CreatePaymentRequest, clientIP string)
func (h *PaymentHandler) Create(c *gin.Context) {
	var req createPaymentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	userID, ok := getUserIDFromCtx(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	resp, err := h.svc.CreatePayment(
		c.Request.Context(),
		userID,
		&model.CreatePaymentRequest{Plan: req.Plan, Method: req.Method},
		c.ClientIP(),
	)
	if err != nil {
		h.log.Error("create payment", "err", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "không thể tạo đơn thanh toán"})
		return
	}

	c.JSON(http.StatusOK, resp)
}

// ─────────────────────────────────────────────
//  GET /payment/vnpay/callback
// ─────────────────────────────────────────────

// VNPayCallback xử lý redirect từ VNPay rồi redirect user về frontend.
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
//  POST /webhook/vnpay
// ─────────────────────────────────────────────

// VNPayWebhook nhận IPN từ VNPay, phải trả RspCode=00 nếu xử lý được.
func (h *PaymentHandler) VNPayWebhook(c *gin.Context) {
	params := c.Request.URL.Query()

	if err := h.svc.HandleVNPayWebhook(c.Request.Context(), params); err != nil {
		h.log.Error("vnpay webhook", "err", err)
		c.JSON(http.StatusOK, gin.H{"RspCode": "97", "Message": "Fail checksum"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"RspCode": "00", "Message": "Confirm Success"})
}

// ─────────────────────────────────────────────
//  POST /webhook/momo
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
		c.JSON(http.StatusOK, gin.H{"message": "error"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "ok"})
}

// ─────────────────────────────────────────────
//  GET /payment/history
// ─────────────────────────────────────────────

// History trả danh sách giao dịch của user (có pagination).
// Service method tên là GetHistory (không phải GetPaymentHistory).
func (h *PaymentHandler) History(c *gin.Context) {
	userID, ok := getUserIDFromCtx(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	page := queryInt(c, "page", 1)
	pageSize := queryInt(c, "page_size", 20)

	resp, err := h.svc.GetHistory(c.Request.Context(), userID, page, pageSize)
	if err != nil {
		h.log.Error("payment history", "err", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "không thể lấy lịch sử"})
		return
	}

	c.JSON(http.StatusOK, resp)
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

// queryInt đọc int từ query string; dùng strconv để tránh import fmt.
func queryInt(c *gin.Context, key string, defaultVal int) int {
	vStr := c.DefaultQuery(key, "")
	if vStr == "" {
		return defaultVal
	}
	v, err := strconv.Atoi(vStr)
	if err != nil || v < 1 {
		return defaultVal
	}
	return v
}
