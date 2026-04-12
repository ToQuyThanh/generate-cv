-- +goose Up
-- +goose StatementBegin

CREATE TABLE payment_transactions (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    plan         TEXT NOT NULL CHECK (plan IN ('weekly', 'monthly')),
    method       TEXT NOT NULL CHECK (method IN ('vnpay', 'momo')),
    amount_vnd   INTEGER NOT NULL CHECK (amount_vnd > 0),
    status       TEXT NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending', 'success', 'failed', 'refunded')),
    provider_ref TEXT,                          -- mã giao dịch phía VNPay / MoMo (unique khi success)
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    paid_at      TIMESTAMPTZ
);

-- Index để query history của user nhanh
CREATE INDEX idx_payment_transactions_user_id ON payment_transactions(user_id);
-- Index để tìm theo provider_ref khi nhận webhook (idempotency check)
CREATE INDEX idx_payment_transactions_provider_ref ON payment_transactions(provider_ref)
    WHERE provider_ref IS NOT NULL;

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP TABLE IF EXISTS payment_transactions;
-- +goose StatementEnd
