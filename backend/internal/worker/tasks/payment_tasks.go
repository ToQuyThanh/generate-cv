package tasks

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/hibiken/asynq"
)

// Task type constants
const (
	TypeEmailPaymentSuccess = "email:payment_success"
)

// Enqueuer là interface để PaymentService enqueue job mà không phụ thuộc asynq trực tiếp.
type Enqueuer interface {
	EnqueuePaymentSuccess(ctx context.Context, userID, plan string) error
}

// AsynqEnqueuer implement Enqueuer bằng asynq.Client.
type AsynqEnqueuer struct {
	client *asynq.Client
}

func NewAsynqEnqueuer(client *asynq.Client) *AsynqEnqueuer {
	return &AsynqEnqueuer{client: client}
}

// PaymentSuccessPayload là dữ liệu gửi kèm job email:payment_success.
type PaymentSuccessPayload struct {
	UserID string `json:"user_id"`
	Plan   string `json:"plan"`
}

// EnqueuePaymentSuccess enqueue job gửi email thông báo thanh toán thành công.
// Job được retry tối đa 3 lần, timeout 30 giây.
func (e *AsynqEnqueuer) EnqueuePaymentSuccess(ctx context.Context, userID, plan string) error {
	payload, err := json.Marshal(PaymentSuccessPayload{UserID: userID, Plan: plan})
	if err != nil {
		return fmt.Errorf("enqueue payment success: marshal: %w", err)
	}

	task := asynq.NewTask(TypeEmailPaymentSuccess, payload,
		asynq.MaxRetry(3),
		asynq.Timeout(30*time.Second),
		asynq.Queue("email"),
	)

	_, err = e.client.EnqueueContext(ctx, task)
	if err != nil {
		return fmt.Errorf("enqueue payment success: enqueue: %w", err)
	}

	return nil
}

// HandlePaymentSuccessEmail là worker handler xử lý job email:payment_success.
// Đăng ký vào asynq.ServeMux ở main.go.
func HandlePaymentSuccessEmail(emailSvc EmailSender) asynq.HandlerFunc {
	return func(ctx context.Context, t *asynq.Task) error {
		var p PaymentSuccessPayload
		if err := json.Unmarshal(t.Payload(), &p); err != nil {
			return fmt.Errorf("handle payment_success email: unmarshal: %w", err)
		}

		return emailSvc.SendPaymentSuccess(ctx, p.UserID, p.Plan)
	}
}

// EmailSender interface — implement bằng Resend client ở pkg/email/.
type EmailSender interface {
	SendPaymentSuccess(ctx context.Context, userID, plan string) error
}
