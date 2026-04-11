# Release Note — Tuần 1: Khởi tạo dự án & Database

**Ngày:** Tháng 4 / 2026  
**Phase:** 1 — Backend Core  
**Trạng thái:** ✅ Hoàn thành

---

## Tóm tắt

Tuần 1 hoàn thành toàn bộ phần khởi tạo nền tảng backend: cấu trúc project,
cấu hình môi trường, hạ tầng local (Docker), schema database, và code
generation (sqlc). Server đã có thể khởi động và trả lời health check.

---

## Những gì đã làm

### 🏗️ Project setup
- Khởi tạo Go module `github.com/yourname/generate-cv` (Go 1.22)
- Cài và cấu hình **Gin** làm HTTP framework
- Cấu hình `config/` đọc `.env` bằng **viper** — hỗ trợ default value, env override, và kiểm tra `JWT_SECRET` ở production
- Tạo `.env.example` với toàn bộ biến môi trường cần thiết

### 🐳 Docker Compose
- **PostgreSQL 16** (Alpine) — health check, persistent volume
- **Redis 7** (Alpine) — health check, persistent volume
- Cả hai service đều có `restart: unless-stopped`

### 🗄️ Database
- **Migration đầu tiên** (`001_initial_schema.sql`) với goose:
  - Bảng `users` — UUID PK, email unique, password nullable (hỗ trợ Google OAuth)
  - Bảng `refresh_tokens` — FK → users, cascade delete
  - Bảng `subscriptions` — 1-1 với users, plan: free/weekly/monthly
  - Bảng `cvs` — sections lưu JSONB, FK → users
  - Bảng `templates` — TEXT PK, tags TEXT array, is_premium flag
  - Index trên `user_id` cho cvs, subscriptions, refresh_tokens
  - Down migration đúng thứ tự FK

### ⚙️ sqlc
- `sqlc.yaml` cấu hình engine PostgreSQL, emit JSON tags, pointer cho nullable types
- SQL queries cho: `users`, `refresh_tokens`, `subscriptions`, `cvs`, `templates`
- Dùng `sqlc.narg()` cho partial update (COALESCE pattern)

### 🌐 Router & Server
- Gin router với `Logger` + `Recovery` middleware
- `GET /health` → `{"status": "ok"}`
- `GET /api/v1/ping` → `{"message": "pong"}`
- Graceful shutdown xử lý SIGINT/SIGTERM, timeout 10 giây
- Production mode khi `APP_ENV=production`

### 🧰 Tooling
- `Makefile` với các lệnh: `run`, `test`, `lint`, `sqlc`, `migrate-*`, `docker-*`
- `pkg/database/` helper: `NewPool()` mở pgxpool và ping; `RunMigrations()` chạy goose từ embedded FS
- `README.md` đầy đủ hướng dẫn chạy local

---

## Test đã viết

| File | Nội dung |
|---|---|
| `config/config_test.go` | Default values, env override, DSN format, URL format |
| `internal/router/router_test.go` | `GET /health`, `GET /api/v1/ping`, route không tồn tại trả 404 |
| `db/migrations_test/migrations_test.go` | File tồn tại, goose annotations đủ, CREATE TABLE đủ 5 bảng, DROP order đúng FK |

Tất cả test không cần database thật, chạy được với `make test`.

---

## Deliverable

- [x] Docker Compose chạy được (`make docker-up`)
- [x] Migration thành công (`make migrate-up`)
- [x] `sqlc generate` ra code (sau khi cài sqlc CLI)
- [x] Server khởi động và trả lời `/health`
- [x] Unit test pass (`make test`)

---

## Việc chưa làm (chuyển sang Tuần 2)

- Auth API: register, login, refresh token, logout, forgot/reset password
- Middleware `AuthJWT`
- Google OAuth2 callback

---

## Cách chạy nhanh

```bash
cd backend
cp .env.example .env
make docker-up        # Khởi động PostgreSQL + Redis
make migrate-up       # Chạy migration
make sqlc             # Sinh code (cần cài sqlc CLI)
make run              # Chạy server
make test             # Chạy toàn bộ test
```
