// Package email provides email-sending utilities.
// In Phase 1 & 2 Week 2, a no-op sender is used so the auth flow compiles
// without a real Resend API key. The Resend client is wired in Week 8.
package email

import (
	"context"
	"log"
)

// NoOpSender logs emails to stdout instead of sending them.
// Satisfies service.EmailSender interface.
type NoOpSender struct{}

func NewNoOpSender() *NoOpSender { return &NoOpSender{} }

func (n *NoOpSender) SendPasswordReset(_ context.Context, toEmail, resetToken string) error {
	log.Printf("[email:noop] password reset for %s — token: %s", toEmail, resetToken)
	return nil
}
