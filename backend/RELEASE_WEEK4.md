# Release — Tuần 4: User API + Template API + Middleware + Sentry

**Ngày:** Tháng 4/2026
**Phase:** Phase 1 — Backend Core
**Trạng thái:** ✅ Hoàn thành

---

## Tóm tắt

Tuần 4 hoàn thiện Phase 1 bằng cách thêm User API, Template API, middleware
RateLimit (Redis sliding-window), RequestID, RequestLogger, và tích hợp Sentry.
Seed 8 templates vào DB qua migration 003. README được cập nhật đầy đủ.

---

## Files mới / đã thay đổi

| File | Thay đổi |
|---|---|
| `db/migrations/003_seed_templates.sql` | ✅ MỚI — seed 3 free + 5 premium templates |
| `internal/model/user.go` | ✅ MỚI — UpdateUserRequest, SubscriptionResponse, UserWithSubResponse |
| `internal/model/template.go` | ✅ MỚI — ListTemplatesQuery, TemplateResponse, ListTemplatesResponse |
| `internal/repository/auth.go` | ✅ CẬP NHẬT — thêm UpdateFields, Delete (User), GetByUserID (Subscription) |
| `internal/repository/template.go` | ✅ MỚI — TemplateRepository: List (filter), GetByID |
| `internal/service/user.go` | ✅ MỚI — UserService: GetMe, UpdateMe, DeleteMe, GetSubscription |
| `internal/service/template.go` | ✅ MỚI — TemplateService: List, Get |
| `internal/handler/user.go` | ✅ MỚI — UserHandler: 4 HTTP handlers |
| `internal/handler/template.go` | ✅ MỚI — TemplateHandler: 2 HTTP handlers |
| `internal/middleware/ratelimit.go` | ✅ MỚI — Redis sliding-window RateLimit |
| `internal/middleware/logger.go` | ✅ MỚI — RequestID + RequestLogger |
| `internal/router/router.go` | ✅ CẬP NHẬT — wire User/Template routes + middleware |
| `cmd/server/main.go` | ✅ CẬP NHẬT — init Redis client + Sentry |
| `config/config.go` | ✅ CẬP NHẬT — thêm SentryConfig, APP_RELEASE |
| `pkg/redisutil/client.go` | ✅ MỚI — Redis client factory với PING check |
| `pkg/sentryutil/sentry.go` | ✅ MỚI — Sentry init/flush/capture wrapper |
| `internal/service/user_test.go` | ✅ MỚI — 10 test cases |
| `internal/service/template_test.go` | ✅ MỚI — 5 test cases |
| `internal/handler/user_test.go` | ✅ MỚI — 7 test cases |
| `internal/handler/template_test.go` | ✅ MỚI — 4 test cases |
| `go.mod` | ✅ CẬP NHẬT — thêm getsentry/sentry-go |
| `.env.example` | ✅ CẬP NHẬT — thêm SENTRY_DSN, APP_RELEASE |
| `Makefile` | ✅ CẬP NHẬT — thêm test-user, test-template, test-week4 |
| `README.md` | ✅ CẬP NHẬT — hướng dẫn đầy đủ Phase 1 |

---

## Endpoints đã implement

### User API (yêu cầu JWT)

| Method | Path | Mô tả |
|---|---|---|
| GET    | `/api/v1/users/me`               | User info + subscription |
| PATCH  | `/api/v1/users/me`               | Partial update full_name / avatar_url |
| DELETE | `/api/v1/users/me`               | Xóa tài khoản, cascade CVs + tokens |
| GET    | `/api/v1/users/me/subscription`  | Chi tiết subscription |

### Template API (public)

| Method | Path | Mô tả |
|---|---|---|
| GET | `/api/v1/templates` | List, filter `is_premium` và `tag` |
| GET | `/api/v1/templates/:id` | Detail |

---

## Quyết định kỹ thuật

- **Templates public:** Không cần JWT — frontend cần hiển thị templates ngay trên trang chọn trước khi đăng ký
- **RateLimit fail-open:** Khi Redis lỗi, request vẫn được xử lý — tránh Redis downtime kéo theo API downtime
- **DeleteMe cascade:** Hard delete user → PostgreSQL CASCADE xóa CVs, refresh_tokens, subscription. Không dùng soft delete ở Phase 1
- **GetSubscription default:** Nếu chưa có subscription row (edge case), trả về `free/active` thay vì 404
- **RequestID echo:** Header `X-Request-ID` được echo lại trong response để client/Sentry có thể trace
- **Sentry no-op khi DSN rỗng:** Dev không cần cấu hình Sentry — SDK init bị skip hoàn toàn
- **Sliding-window vs fixed-window:** Dùng sorted set ZREMRANGEBYSCORE → chính xác hơn fixed-window, không có burst problem ở đầu mỗi window

---

## Chạy tests

```bash
# Tất cả tuần 4
make test-week4

# Riêng từng domain
make test-user
make test-template

# Toàn bộ unit tests (tuần 1–4)
make test-unit
```

---

## Checklist tuần 4

- [x] `GET /users/me` — trả user info kèm subscription
- [x] `PATCH /users/me` — partial update full_name, avatar_url
- [x] `DELETE /users/me` — xóa user, cascade CVs và tokens
- [x] `GET /users/me/subscription` — chi tiết subscription
- [x] `GET /templates` — list có filter is_premium + tag
- [x] `GET /templates/:id` — detail template
- [x] Seed data: 3 template free + 5 template premium (migration 003)
- [x] Middleware `RateLimit` — Redis sliding window (60/min users, 120/min CVs)
- [x] Middleware `RequestID` — inject/echo X-Request-ID
- [x] Middleware `RequestLogger` — structured log mỗi request
- [x] Setup Sentry — init trong main, no-op khi DSN rỗng
- [x] Unit test service user — 10 test cases
- [x] Unit test service template — 5 test cases
- [x] Unit test handler user — 7 test cases
- [x] Unit test handler template — 4 test cases
- [x] README cập nhật đầy đủ hướng dẫn chạy local + bảng endpoints
- [x] .env.example cập nhật SENTRY_DSN + APP_RELEASE

---

## Kết quả Phase 1

Phase 1 (Tuần 1–4) **hoàn thành**. Toàn bộ API đã sẵn sàng:

| Nhóm | Số endpoints |
|---|---|
| Auth | 8 |
| CV | 6 |
| User | 4 |
| Template | 2 |
| **Tổng** | **20** |

**MRR:** 0 VND (chưa có payment — Phase 2)

---

## Tuần tiếp theo (Tuần 5 — Phase 2)

- Setup Asynq + Redis worker trong `internal/worker/`
- Cài go-rod, test render HTML → PDF local
- `POST /cvs/:id/export` — enqueue job, trả job_id
- `GET /cvs/:id/export/:jobId` — poll trạng thái
- GCS client + signed URL
