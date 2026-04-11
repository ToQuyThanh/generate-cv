# generate-cv — Backend

> Go · Gin · PostgreSQL · Redis · sqlc · goose

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

### 3. Chạy database migration

```bash
make migrate-up
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
```

---

## Chạy test

```bash
make test
```

Test không cần DB thật — chỉ unit test + router test dùng `httptest`.

---

## Cấu trúc thư mục

```
backend/
├── cmd/server/         # Entrypoint
├── config/             # Đọc .env với viper
├── db/
│   ├── migrations/     # Goose SQL migrations
│   ├── queries/        # sqlc SQL queries
│   └── sqlc/           # ← generated (KHÔNG sửa tay)
├── internal/
│   └── router/         # Gin router + middleware
├── pkg/
│   └── database/       # pgxpool helper + migration runner
├── docker-compose.yml
├── sqlc.yaml
└── Makefile
```

---

## Các lệnh hữu ích

```bash
make migrate-status   # Xem trạng thái migration
make migrate-down     # Rollback 1 bước
make docker-reset     # Xoá toàn bộ volume, khởi động lại từ đầu
```

---

## Lộ trình phát triển

Xem [`../plan.md`](../plan.md) để biết chi tiết từng tuần.
