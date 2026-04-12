# Release v0.4.0 — Payment Integration (Tuần 7)

**Ngày:** 2026-04-12  
**Phase:** 2 · Tuần 7/8  
**PR:** `feat/week7-payment`  
**Tác giả:** Backend team

---

## Tóm tắt

Hoàn thiện toàn bộ hệ thống thanh toán cho generate-cv:
- Tích hợp **VNPay** và **MoMo** sandbox end-to-end
- Webhook IPN với xác thực HMAC
- Subscription tự động nâng/hạ cấp
- Email thông báo sau thanh toán thành công

---

## Cách test trên sandbox

### Yêu cầu
- Docker Compose đang chạy (PostgreSQL + Redis)
- Chạy migration: `goose -dir db/migrations postgres "$DB_URL" up`
- Điền biến môi trường VNPay + MoMo sandbox vào `.env`
- Có thể nhận webhook từ internet (dùng [ngrok](https://ngrok.com) nếu dev local)

### Test VNPay

```bash
# 1. Tạo link thanh toán
curl -X POST http://localhost:8080/payment/create \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json" \
  -d '{"plan": "weekly", "method": "vnpay"}'

# Response: {"transaction_id": "...", "payment_url": "https://sandbox.vnpayment.vn/..."}

# 2. Mở payment_url trên browser
# 3. Dùng thẻ test: 9704198526191432198 - NGUYEN VAN A - 07/15 - OTP: 123456
# 4. VNPay redirect về /payment/vnpay/callback → kiểm tra DB
```

### Test MoMo

```bash
# 1. Tạo link thanh toán
curl -X POST http://localhost:8080/payment/create \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json" \
  -d '{"plan": "monthly", "method": "momo"}'

# 2. Mở payUrl trên browser hoặc quét QR bằng app MoMo test
# 3. MoMo gọi IPN về /webhook/momo → kiểm tra DB

# Kiểm tra IPN thủ công bằng MoMo simulator:
# https://developers.momo.vn/#/docs/en/aiov2/?id=test-payment
```

### Kiểm tra kết quả

```sql
-- Xem giao dịch
SELECT id, plan, method, status, provider_ref, paid_at
FROM payment_transactions
ORDER BY created_at DESC LIMIT 10;

-- Xem subscription
SELECT user_id, plan, status, expires_at
FROM subscriptions
WHERE status = 'active';
```

### Test cron expire (local)

```bash
# Override interval trong test về 1 phút để verify nhanh
go test ./internal/cron/... -v -run TestSubscriptionExpirer
```

### Chạy toàn bộ test suite

```bash
go test ./pkg/payment/... -v
go test ./internal/service/... -v
go test ./internal/cron/... -v
```

---

## Checklist trước khi merge

- [x] Migration `007` chạy thành công trên DB local
- [x] `sqlc generate` không có lỗi
- [x] Tất cả unit test pass (`go test ./...`)
- [x] VNPay sandbox: tạo link → thanh toán → callback về đúng
- [x] MoMo sandbox: tạo link → IPN nhận → DB cập nhật
- [x] `GET /payment/history` trả đúng pagination
- [x] Cron expire hạ cấp đúng tài khoản hết hạn
- [x] Email job `email:payment_success` được enqueue sau thanh toán
- [x] Webhook idempotent (gọi 2 lần không double-update)
- [x] CHANGELOG.md cập nhật
- [ ] Test với tài khoản merchant sandbox thật (cần credential từ VNPay / MoMo)

---

## Việc còn lại (Tuần 8)

- Implement `emailSvc.SendPaymentSuccess()` trong `pkg/email/` dùng Resend
- Viết integration test end-to-end với DB thật (testcontainers-go)
- Thêm Prometheus counter cho `payment_success_total` / `payment_failed_total`
- Deploy lên staging và chạy smoke test

---

## Breaking changes

Không có. Tất cả endpoint mới, không thay đổi API cũ.

## Database changes

Chạy migration trước khi deploy:
```bash
goose -dir db/migrations postgres "$DATABASE_URL" up
```
