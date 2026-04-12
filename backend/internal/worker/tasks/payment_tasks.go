// Package tasks defines background job payloads and handler interfaces.
// It intentionally has NO dependency on any specific queue library (asynq, etc.)
// so the rest of the codebase only depends on the JobEnqueuer interface.
package tasks

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
)

// Task type constants — used as keys in the job queue.
const (
	TypeEmailPaymentSuccess = "email:payment_success"
)

// PaymentSuccessPayload is the data carried by a TypeEmailPaymentSuccess job.
type PaymentSuccessPayload struct {
	UserID string `json:"user_id"`
	Plan   string `json:"plan"`
}

// Encode serialises the payload to JSON bytes for enqueuing.
func (p PaymentSuccessPayload) Encode() ([]byte, error) {
	b, err := json.Marshal(p)
	if err != nil {
		return nil, fmt.Errorf("PaymentSuccessPayload.Encode: %w", err)
	}
	return b, nil
}

// DecodePaymentSuccessPayload parses raw job bytes back into a payload.
func DecodePaymentSuccessPayload(raw []byte) (*PaymentSuccessPayload, error) {
	var p PaymentSuccessPayload
	if err := json.Unmarshal(raw, &p); err != nil {
		return nil, fmt.Errorf("DecodePaymentSuccessPayload: %w", err)
	}
	return &p, nil
}

// EmailSender is the interface the job handler expects for sending emails.
// Implement it with a real Resend client in pkg/email/.
type EmailSender interface {
	SendPaymentSuccess(ctx context.Context, userID, plan string) error
}

// HandlePaymentSuccessEmail returns a handler func (raw []byte) compatible
// with whatever worker mux you wire up (Redis LPOP loop, asynq, etc.).
// The handler decodes the payload and delegates to EmailSender.
func HandlePaymentSuccessEmail(emailSvc EmailSender, log *slog.Logger) func(ctx context.Context, payload []byte) error {
	return func(ctx context.Context, payload []byte) error {
		p, err := DecodePaymentSuccessPayload(payload)
		if err != nil {
			return err
		}
		log.Info("sending payment success email", "user_id", p.UserID, "plan", p.Plan)
		return emailSvc.SendPaymentSuccess(ctx, p.UserID, p.Plan)
	}
}
