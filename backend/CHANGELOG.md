# CHANGELOG

---

## [0.4.0] — 2026-04-12 · Tuần 7: Payment Integration

### Added

#### Database
- Migration `007_payment_transactions.sql`: bảng `payment_transactions` với các cột
  `id`, `user_id`, `plan`, `method`, `amount_vnd`, `status`, `provider_ref`, `created_at`, `paid_at`
- Index `idx_payment_transactions_user_id` cho query history
- Index `idx_payment_transactions_provider_ref` cho idempotency check
- sqlc queries: `CreatePaymentTransaction`, `UpdatePaymentTransactionSuccess`,
  `UpdatePaymentTransactionFailed`, `ListPaymentTransactionsByUser`,
  `CountPaymentTransactionsByUser`, `UpdateSubscription`, `ExpireSubscriptions`

#### Payment Providers (`pkg/payment/`)
- **VNPay provider** (`vnpay.go`):
  - `CreatePaymentURL()` — tạo URL đã ký HMAC-SHA512, tuân thủ VNPay spec v2.1.0
  - `VerifyWebhook()` — xác thực IPN / callback signature
  - `IsVNPaySuccess()` — kiểm tra `vnp_ResponseCode=00` + `vnp_TransactionStatus=00`
  - `ExtractVNPayInfo()` — lấy `txnRef` và `transactionNo`
- **MoMo provider** (`momo.go`):
  - `CreatePaymentURL()` — gọi MoMo API v2 `captureWallet`, timeout 10s
  - `VerifyIPN()` — xác thực HMAC-SHA256 theo spec MoMo v2
  - `IsSuccess()` — kiểm tra `resultCode=0`

#### Service (`internal/service/`)
- **PaymentService**:
  - `CreatePayment()` — tạo `payment_transactions` pending + trả URL thanh toán
  - `HandleVNPayCallback()` — xử lý redirect GET từ VNPay (verify + finalize)
  - `HandleVNPayWebhook()` — xử lý IPN POST từ VNPay (verify + finalize)
  - `HandleMoMoWebhook()` — xử lý IPN POST từ MoMo (verify + finalize)
  - `GetPaymentHistory()` — danh sách giao dịch có pagination (page, page_size)
  - `finalizeTransaction()` — idempotent update DB + kích hoạt subscription + enqueue email

#### Handler (`internal/handler/`)
- `PaymentHandler` với 5 endpoint:
  - `POST /payment/create` — tạo URL thanh toán (cần auth)
  - `GET  /payment/vnpay/callback` — redirect sau thanh toán (public)
  - `POST /webhook/vnpay` — IPN server-to-server (public, bảo vệ bằng HMAC)
  - `POST /webhook/momo` — IPN server-to-server (public, bảo vệ bằng HMAC)
  - `GET  /payment/history` — lịch sử giao dịch (cần auth, có pagination)

#### Worker (`internal/worker/tasks/`)
- Task type `email:payment_success`
- `AsynqEnqueuer.EnqueuePaymentSuccess()` — enqueue vào queue `email`, retry 3, timeout 30s
- `HandlePaymentSuccessEmail()` — Asynq handler để đăng ký vào ServeMux

#### Cron (`internal/cron/`)
- `SubscriptionExpirer` — chạy mỗi 1 giờ, gọi `ExpireSubscriptions` hạ cấp tài khoản hết hạn
- Support `WithInterval()` để override trong test
- Graceful stop khi context cancel

#### Routes (`internal/routes/`)
- `RegisterPaymentRoutes()` — đăng ký toàn bộ route payment + webhook vào Gin engine
- Route guard: public routes không cần JWT, private routes dùng `AuthJWT` middleware

### Tests Added
- `pkg/payment/vnpay_test.go` — 11 test cases: URL generation, HMAC signature, VerifyWebhook, IsSuccess, ExtractInfo
- `pkg/payment/momo_test.go` — 9 test cases: mock HTTP server, VerifyIPN, IsSuccess, error paths
- `internal/service/payment_service_test.go` — 12 test cases: mock DB + Enqueuer, CreatePayment, HandleWebhook, History
- `internal/cron/subscription_expire_test.go` — 4 test cases: run once, DB error, context cancel

### Changed
- `db/queries/payment.sql` thêm query `ExpireSubscriptions` cập nhật subscription hết hạn

### Environment Variables Added
```
VNPAY_TMN_CODE
VNPAY_HASH_SECRET
VNPAY_URL
VNPAY_RETURN_URL
VNPAY_IPN_URL
MOMO_PARTNER_CODE
MOMO_ACCESS_KEY
MOMO_SECRET_KEY
MOMO_API_URL
MOMO_REDIRECT_URL
MOMO_IPN_URL
PRICE_WEEKLY      (default: 49000)
PRICE_MONTHLY     (default: 149000)
```

---

## [0.3.0] — Tuần 6: AI Integration
## [0.2.0] — Tuần 5: PDF Export
## [0.1.0] — Phase 1: Auth + CV + User + Template API
