package routes

import (
	"github.com/gin-gonic/gin"
	"github.com/yourname/generate-cv/internal/handler"
	"github.com/yourname/generate-cv/internal/middleware"
)

// RegisterPaymentRoutes đăng ký tất cả route cho Payment vào Gin router.
//
// Routes công khai (không cần auth):
//   GET  /payment/vnpay/callback  ← VNPay redirect sau thanh toán
//   POST /webhook/vnpay           ← VNPay IPN server-to-server
//   POST /webhook/momo            ← MoMo IPN server-to-server
//
// Routes cần auth:
//   POST /payment/create          ← Tạo link thanh toán
//   GET  /payment/history         ← Lịch sử giao dịch (có pagination)
func RegisterPaymentRoutes(r *gin.Engine, h *handler.PaymentHandler, authMiddleware gin.HandlerFunc) {
	// ── Public (không cần JWT) ──────────────────────────────────────────
	public := r.Group("/")
	{
		// VNPay redirect callback — người dùng được VNPay điều hướng về
		public.GET("/payment/vnpay/callback", h.VNPayCallback)

		// Webhooks IPN — nhận từ VNPay / MoMo server (không qua browser)
		// Bảo vệ bằng HMAC signature, KHÔNG dùng JWT
		webhooks := public.Group("/webhook")
		{
			webhooks.POST("/vnpay", h.VNPayWebhook)
			webhooks.POST("/momo", h.MoMoWebhook)
		}
	}

	// ── Authenticated ───────────────────────────────────────────────────
	auth := r.Group("/")
	auth.Use(authMiddleware)
	{
		payment := auth.Group("/payment")
		{
			payment.POST("/create", h.Create)    // tạo URL thanh toán
			payment.GET("/history", h.History)   // lịch sử giao dịch
		}
	}
}

// RegisterPaymentRoutesOnMux là overload cho trường hợp dùng RouterGroup thay vì Engine trực tiếp.
func RegisterPaymentRoutesOnMux(rg *gin.RouterGroup, h *handler.PaymentHandler) {
	rg.GET("/vnpay/callback", h.VNPayCallback)
	rg.POST("/history", h.History)
	rg.POST("/create", h.Create)
}

// Ví dụ tích hợp vào main.go:
//
//   paymentSvc := service.NewPaymentService(queries, vnpayProvider, momoProvider, enqueuer, logger)
//   paymentHandler := handler.NewPaymentHandler(paymentSvc, logger)
//   routes.RegisterPaymentRoutes(router, paymentHandler, middleware.AuthJWT(jwtSecret))
//
//   // Khởi động cron job expire subscription
//   expirer := cron.NewSubscriptionExpirer(queries, logger)
//   go expirer.Start(ctx)
//
//   // Đăng ký Asynq worker
//   mux := asynq.NewServeMux()
//   mux.HandleFunc(tasks.TypeEmailPaymentSuccess,
//       tasks.HandlePaymentSuccessEmail(emailService))

// RateLimitPaymentMiddleware giới hạn /payment/create — tránh spam tạo giao dịch.
// Dùng Redis sliding window (đã có từ Phase 1 RateLimit middleware).
func RateLimitPaymentMiddleware() gin.HandlerFunc {
	return middleware.RateLimit(middleware.RateLimitConfig{
		Key:      "payment:create",
		Limit:    10,               // 10 request
		Window:   60,              // per 60 giây
		PerUser:  true,
	})
}
