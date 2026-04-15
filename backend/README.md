# generate-cv — Backend

> Go · Gin · PostgreSQL · Redis · sqlc · goose · Sentry

---

## Yêu cầu môi trường

| Tool | Phiên bản tối thiểu |
|---|---|
| Go | 1.22+ |
| Docker Desktop | 4.x |
| sqlc | v1.26+ |
| goose | v3 |
| golangci-lint | v1.58+ (tuỳ chọn) |

Cài sqlc và goose:

```bash
go install github.com/sqlc-dev/sqlc/cmd/sqlc@latest
go install github.com/pressly/goose/v3/cmd/goose@latest
```

---

## Chạy local

### 1. Clone & copy env

```bash
cp .env.example .env
# Chỉnh sửa .env nếu cần (mặc định dùng được ngay với Docker Compose)
```

### 2. Khởi động PostgreSQL + Redis

```bash
make docker-up
```

### 3. Chạy database migration + seed

```bash
make migrate-up
# Migration 003 sẽ seed 3 free templates + 5 premium templates tự động
```

### 4. Sinh code từ sqlc (sau khi thay đổi query SQL)

```bash
make sqlc
```

### 5. Chạy server

```bash
make run
# Server mặc định: http://localhost:8080
```

Kiểm tra nhanh:

```bash
curl http://localhost:8080/health
# {"status":"ok"}

curl http://localhost:8080/api/v1/ping
# {"message":"pong"}

# Templates public (không cần JWT)
curl http://localhost:8080/api/v1/templates
curl http://localhost:8080/api/v1/templates?is_premium=false
curl http://localhost:8080/api/v1/templates?tag=modern
curl http://localhost:8080/api/v1/templates/template_modern_01
```

---

## Chạy test

```bash
# Tất cả tests
make test

# Unit tests (không cần DB)
make test-unit

# Tuần 4: User + Template + RateLimit
make test-week4

# Riêng từng domain
make test-user
make test-template
make test-cv
```

---

## API Endpoints (Phase 1 đầy đủ)

### Auth (public)

| Method | Path | Mô tả |
|---|---|---|
| POST | `/api/v1/auth/register` | Đăng ký tài khoản |
| POST | `/api/v1/auth/login` | Đăng nhập |
| POST | `/api/v1/auth/refresh` | Làm mới access token |
| POST | `/api/v1/auth/logout` | Đăng xuất |
| POST | `/api/v1/auth/forgot-password` | Quên mật khẩu |
| POST | `/api/v1/auth/reset-password` | Đặt lại mật khẩu |
| GET  | `/api/v1/auth/google` | Google OAuth2 redirect |
| GET  | `/api/v1/auth/google/callback` | Google OAuth2 callback |

### Templates (public)

| Method | Path | Mô tả |
|---|---|---|
| GET | `/api/v1/templates` | List templates (filter: `is_premium`, `tag`) |
| GET | `/api/v1/templates/:id` | Chi tiết một template |

### Users (yêu cầu JWT)

| Method | Path | Mô tả |
|---|---|---|
| GET    | `/api/v1/users/me` | Thông tin user + subscription |
| PATCH  | `/api/v1/users/me` | Cập nhật profile |
| DELETE | `/api/v1/users/me` | Xóa tài khoản (cascade) |
| GET    | `/api/v1/users/me/subscription` | Chi tiết subscription |

### CVs (yêu cầu JWT)

| Method | Path | Mô tả |
|---|---|---|
| GET    | `/api/v1/cvs` | Danh sách CV (pagination) |
| POST   | `/api/v1/cvs` | Tạo CV mới |
| GET    | `/api/v1/cvs/:id` | Chi tiết CV |
| PATCH  | `/api/v1/cvs/:id` | Cập nhật CV |
| DELETE | `/api/v1/cvs/:id` | Xóa CV |
| POST   | `/api/v1/cvs/:id/duplicate` | Clone CV |

---

## Rate Limiting

Các endpoint protected dùng Redis sliding-window:

| Group | Giới hạn |
|---|---|
| `/users/*` | 60 req/phút |
| `/cvs/*` | 120 req/phút |

Response headers: `X-RateLimit-Limit`, `X-RateLimit-Remaining`

---

## Cấu trúc thư mục

```
backend/
├── cmd/server/             # Entrypoint
├── config/                 # Đọc .env với viper (+ SentryConfig)
├── db/
│   ├── migrations/         # Goose SQL migrations (001–003)
│   ├── queries/            # sqlc SQL queries
│   └── sqlc/               # ← generated (KHÔNG sửa tay)
├── internal/
│   ├── handler/            # HTTP handlers (auth, cv, user, template)
│   ├── middleware/         # AuthJWT, RateLimit, RequestID, RequestLogger
│   ├── model/              # Request/response structs
│   ├── repository/         # DB access layer
│   ├── router/             # Gin router + dependency wiring
│   └── service/            # Business logic
├── pkg/
│   ├── database/           # pgxpool helper + migration runner
│   ├── email/              # Email sender (noop cho dev)
│   ├── jwtutil/            # JWT encode/decode
│   ├── redisutil/          # Redis client factory
│   └── sentryutil/         # Sentry init wrapper
├── docker-compose.yml
├── sqlc.yaml
└── Makefile
```

---

## Biến môi trường

| Biến | Mặc định | Mô tả |
|---|---|---|
| `APP_ENV` | `development` | `development` hoặc `production` |
| `APP_PORT` | `8080` | Port lắng nghe |
| `APP_RELEASE` | `dev` | Version dùng cho Sentry |
| `DB_HOST` | `localhost` | PostgreSQL host |
| `DB_PORT` | `5432` | PostgreSQL port |
| `DB_USER` | `postgres` | PostgreSQL user |
| `DB_PASSWORD` | `postgres` | PostgreSQL password |
| `DB_NAME` | `generate_cv` | Database name |
| `REDIS_ADDR` | `localhost:6379` | Redis address |
| `REDIS_PASSWORD` | _(rỗng)_ | Redis password |
| `JWT_SECRET` | _(bắt buộc prod)_ | Secret HS256, tối thiểu 32 ký tự |
| `JWT_ACCESS_TTL_MINUTES` | `15` | Thời hạn access token |
| `JWT_REFRESH_TTL_DAYS` | `30` | Thời hạn refresh token |
| `GOOGLE_CLIENT_ID` | _(rỗng)_ | Google OAuth2 client ID |
| `GOOGLE_CLIENT_SECRET` | _(rỗng)_ | Google OAuth2 secret |
| `GOOGLE_REDIRECT_URL` | `http://localhost:8080/...` | OAuth callback URL |
| `SENTRY_DSN` | _(rỗng)_ | Sentry DSN — để trống = tắt |

---

## Các lệnh hữu ích

```bash
make migrate-status   # Xem trạng thái migration
make migrate-down     # Rollback 1 bước
make docker-reset     # Xoá toàn bộ volume, khởi động lại từ đầu
make lint             # Chạy golangci-lint
make sqlc             # Sinh lại code từ SQL queries
```

---

## Lộ trình phát triển

Xem [`../plan.md`](../plan.md) để biết chi tiết từng tuần.

Phase 1 (Tuần 1–4) đã hoàn thành. Tuần tiếp theo: Phase 2 — PDF Export (Asynq + go-rod).
