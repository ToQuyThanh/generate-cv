// Package model defines request / response structs for Payment API.
package model

import (
	"time"

	"github.com/google/uuid"
)

// ─── Request payloads ─────────────────────────────────────────────────────────

// CreatePaymentRequest is the body for POST /payment/create.
type CreatePaymentRequest struct {
	Plan   string `json:"plan"   binding:"required,oneof=weekly monthly"`
	Method string `json:"method" binding:"required,oneof=vnpay momo"`
}

// ─── Response payloads ────────────────────────────────────────────────────────

// CreatePaymentResponse is returned after a payment URL is created.
type CreatePaymentResponse struct {
	TransactionID string `json:"transaction_id"`
	PaymentURL    string `json:"payment_url"`
}

// PaymentTransactionResponse is one item in GET /payment/history.
type PaymentTransactionResponse struct {
	ID          uuid.UUID  `json:"id"`
	Plan        string     `json:"plan"`
	Method      string     `json:"method"`
	AmountVND   int64      `json:"amount_vnd"`
	Status      string     `json:"status"`
	ProviderRef *string    `json:"provider_ref,omitempty"`
	CreatedAt   time.Time  `json:"created_at"`
	PaidAt      *time.Time `json:"paid_at,omitempty"`
}

// PaymentHistoryResponse is the paginated response for GET /payment/history.
type PaymentHistoryResponse struct {
	Data []PaymentTransactionResponse `json:"data"`
	Meta PaginationMeta               `json:"meta"`
}

// PaginationMeta holds pagination info.
type PaginationMeta struct {
	Total    int64 `json:"total"`
	Page     int   `json:"page"`
	PageSize int   `json:"page_size"`
}
