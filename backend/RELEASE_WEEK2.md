# Release — Tuần 2: Auth API

**Ngày:** Tháng 4/2026
**Phase:** Phase 1 — Backend Core
**Trạng thái:** ✅ Hoàn thành

---

## Tóm tắt

Tuần 2 implement toàn bộ Auth API theo đúng kế hoạch. Tất cả 8 endpoint hoạt động,
middleware JWT đã wired vào router, dependency injection sạch qua interfaces,
và test coverage đầy đủ cho service + handler + middleware + jwtutil.

---

## Files mới / đã thay đổi

### Database
| File | Thay đổi |
|---|---|
| `db/migrations/002_password_reset_tokens.sql` | ✅ Bảng `password_reset_tokens` + indexes |
| `db/queries/password_reset_tokens.sql` | ✅ 4 SQL queries cho reset flow |

### Backend
| File | Thay đổi |
|---|---|
| `internal/model/auth.go` | ✅ MỚI — request/response structs, JWTClaims |
| `internal/repository/auth.go` | ✅ MỚI — UserRepo, RefreshTokenRepo, SubscriptionRepo, PasswordResetTokenRepo |
| `pkg/jwtutil/jwt.go` | ✅ MỚI — Sign + Parse HS256, ErrTokenExpired, ErrTokenInvalid |
| `internal/service/auth.go` | ✅ MỚI — AuthService với 7 methods |
| `internal/middleware/auth.go` | ✅ MỚI — AuthJWT middleware + GetUserID helper |
| `internal/handler/auth.go` | ✅ MỚI — 6 HTTP handlers |
| `internal/handler/google_oauth.go` | ✅ MỚI — Google OAuth redirect + callback |
| `internal/router/router.go` | ✅ CẬP NHẬT — đăng ký auth routes, inject pool |
| `cmd/server/main.go` | ✅ CẬP NHẬT — inject DB pool vào router |
| `pkg/email/noop.go` | ✅ MỚI — no-op email sender (placeholder) |
| `go.mod` | ✅ CẬP NHẬT — thêm `golang.org/x/oauth2` |
| `Makefile` | ✅ CẬP NHẬT — thêm granular test targets |

### Tests
| File | Coverage |
|---|---|
| `internal/service/auth_test.go` | 10 test cases: register, login, refresh, logout, forgotPassword, resetPassword |
| `internal/handler/auth_test.go` | 12 test cases: mỗi handler ít nhất 1 happy path + 1 error path |
| `internal/middleware/auth_test.go` | 5 test cases: valid, missing header, invalid, expired, wrong scheme |
| `pkg/jwtutil/jwt_test.go` | 5 test cases: sign+parse, wrong secret, expired, malformed, empty |

---

## Endpoints đã implement

| Method | Path | Auth | Mô tả |
|---|---|---|---|
| POST | `/api/v1/auth/register` | — | Đăng ký, trả access + refresh token |
| POST | `/api/v1/auth/login` | — | Đăng nhập email/password |
| POST | `/api/v1/auth/refresh` | — | Cấp access token mới từ refresh token |
| POST | `/api/v1/auth/logout` | — | Xóa refresh token |
| POST | `/api/v1/auth/forgot-password` | — | Gửi email reset (luôn HTTP 200) |
| POST | `/api/v1/auth/reset-password` | — | Đặt lại mật khẩu bằng token |
| GET  | `/api/v1/auth/google` | — | Redirect đến Google consent screen |
| GET  | `/api/v1/auth/google/callback` | — | Xử lý OAuth callback |
| GET  | `/api/v1/me/ping` | ✅ JWT | Kiểm tra middleware (dev helper) |

---

## Quyết định kỹ thuật

- **Access token:** HS256 JWT, payload `{sub, uid, iat, exp}`, TTL 15 phút
- **Refresh token:** UUID ngẫu nhiên, lưu PostgreSQL, TTL 30 ngày — không phải JWT
- **`POST /auth/forgot-password`:** luôn trả HTTP 200 dù email không tồn tại (chống user enumeration)
- **Repository layer:** wrap pgx trực tiếp thay vì dùng sqlc-generated code trong service — giữ boundary sạch
- **Service dùng interfaces:** `UserRepo`, `RefreshTokenRepo`... → mock trong test, không cần DB thật
- **`ResetPassword` invalidates all refresh tokens:** bảo mật sau khi đổi mật khẩu
- **Email sender:** `NoOpSender` log ra stdout — thay bằng Resend client ở tuần 8

---

## Chạy tests

```bash
# Unit tests (không cần DB)
make test-unit

# Granular
make test-service
make test-handler
make test-jwt
make test-middleware

# Tất cả (bao gồm integration — cần Docker)
make docker-up-migrate
make test
```

---

## Checklist tuần 2

- [x] `POST /auth/register` — bcrypt, tạo subscription free, trả JWT
- [x] `POST /auth/login` — so sánh password, trả access + refresh token
- [x] `POST /auth/refresh` — verify DB, cấp access token mới
- [x] `POST /auth/logout` — xóa refresh token
- [x] `POST /auth/forgot-password` — tạo reset token, gửi email, luôn 200
- [x] `POST /auth/reset-password` — verify token, cập nhật password, invalidate tokens
- [x] Middleware `AuthJWT` — parse Bearer token, inject `userID` vào context
- [x] Google OAuth2 — redirect + callback
- [x] Unit test service layer — 10 test cases
- [x] Unit test handler layer — 12 test cases
- [x] Unit test middleware — 5 test cases
- [x] Unit test jwtutil — 5 test cases

---

## Tuần tiếp theo (Tuần 3)

Implement CV API:
- `GET /cvs` — list CVs có pagination
- `POST /cvs` — tạo CV từ template
- `GET /cvs/:id` — lấy CV (verify ownership)
- `PATCH /cvs/:id` — partial update
- `DELETE /cvs/:id`
- `POST /cvs/:id/duplicate`
