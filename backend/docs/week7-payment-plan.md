# Tuần 7 — Payment Integration: Kế hoạch chi tiết

## Mục tiêu
Tích hợp thanh toán VNPay + MoMo sandbox end-to-end.  
Kết thúc tuần: test được giao dịch thật trên sandbox, subscription tự động cập nhật.

---

## Kiến trúc luồng thanh toán

```
Client
  │
  ├─ POST /payment/create  ──────────────────────────┐
  │    body: { plan, method }                         │
  │                                                   ▼
  │                                       PaymentService.CreatePaymentURL()
  │                                           │
  │                                           ├─ Insert payment_transactions (status=pending)
  │                                           ├─ VNPay: sign params với HMAC-SHA512 → return URL
  │                                           └─ MoMo: gọi MoMo API → return payUrl
  │
  │    ← { payment_url, transaction_id }
  │
  ├─ Redirect user tới payment_url (VNPay / MoMo gateway)
  │
  │  [User thanh toán trên gateway]
  │
  ├─ GET /payment/vnpay/callback   (VNPay redirect về sau thanh toán)
  │    query: vnp_* params
  │    → Verify HMAC → Update DB → Redirect /payment/result?status=...
  │
  ├─ POST /webhook/vnpay            (VNPay IPN — server-to-server)
  │    body: vnp_* params
  │    → Verify HMAC-SHA512 → Idempotent update → Return RspCode=00
  │
  └─ POST /webhook/momo             (MoMo IPN — server-to-server)
       body: { orderId, resultCode, signature, ... }
       → Verify HMAC-SHA256 → Idempotent update → Return HTTP 200

Sau khi webhook xác nhận thành công:
  → Update subscriptions (plan, expires_at)
  → Enqueue Asynq job: email:payment_success
  → (Cron mỗi giờ) subscription:expire hạ cấp tài khoản hết hạn
```

---

## Cấu trúc file sẽ tạo

```
backend/
├── db/
│   ├── migrations/
│   │   └── 007_payment_transactions.sql
│   └── queries/
│       └── payment.sql
├── internal/
│   ├── handler/
│   │   └── payment_handler.go
│   ├── service/
│   │   └── payment_service.go
│   └── cron/
│       └── subscription_expire.go
├── pkg/
│   └── payment/
│       ├── vnpay.go
│       └── momo.go
├── internal/worker/
│   └── tasks/
│       └── payment_tasks.go
└── internal/routes/
    └── payment_routes.go   (thêm vào router chính)
```

---

## Checklist tuần 7

### Ngày 1–2: Database + Provider
- [x] Viết migration `007_payment_transactions.sql`
- [x] Viết sqlc queries cho payment
- [x] VNPay provider: sign URL, verify HMAC-SHA512
- [x] MoMo provider: tạo request, verify HMAC-SHA256

### Ngày 3–4: Service + Handler
- [x] `PaymentService`: CreatePaymentURL, HandleVNPayWebhook, HandleMoMoWebhook
- [x] `PaymentHandler`: HTTP handler layer
- [x] Đăng ký routes `/payment/*` và `/webhook/*`
- [x] Cron job `subscription:expire`

### Ngày 5: Test + Release
- [x] Unit test VNPay signature
- [x] Unit test MoMo signature
- [x] Unit test PaymentService
- [x] Integration test với sandbox
- [x] Viết RELEASE.md

---

## Biến môi trường cần thêm

```env
# VNPay
VNPAY_TMN_CODE=your_tmn_code
VNPAY_HASH_SECRET=your_secret
VNPAY_URL=https://sandbox.vnpayment.vn/paymentv2/vpcpay.html
VNPAY_RETURN_URL=https://yourdomain.com/payment/vnpay/callback
VNPAY_IPN_URL=https://yourdomain.com/webhook/vnpay

# MoMo
MOMO_PARTNER_CODE=your_partner_code
MOMO_ACCESS_KEY=your_access_key
MOMO_SECRET_KEY=your_secret_key
MOMO_API_URL=https://test-payment.momo.vn/v2/gateway/api/create
MOMO_REDIRECT_URL=https://yourdomain.com/payment/result
MOMO_IPN_URL=https://yourdomain.com/webhook/momo

# Giá gói (VND)
PRICE_WEEKLY=49000
PRICE_MONTHLY=149000

# App
APP_BASE_URL=https://yourdomain.com
```

---

## Giá gói

| Gói | Thời hạn | Giá |
|-----|----------|-----|
| weekly | 7 ngày | 49.000 VND |
| monthly | 30 ngày | 149.000 VND |

---

## Rủi ro & Mitigation

| Rủi ro | Mitigation |
|--------|-----------|
| Webhook đến 2 lần | Check idempotency bằng `provider_ref` UNIQUE hoặc status check |
| HMAC sai do encoding | Test kỹ ký tự đặc biệt, dùng `url.QueryEscape` chuẩn |
| Subscription không expire | Cron job mỗi giờ + log rõ ràng |
| Timeout gọi MoMo API | Timeout 10s + retry 1 lần |
