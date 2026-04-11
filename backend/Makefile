.PHONY: run test test-unit test-integration lint sqlc migrate-up migrate-down migrate-status docker-up docker-down docker-reset

## ── Dev ─────────────────────────────────────────────────────────────────────

run:
	go run ./cmd/server/...

## ── Test ────────────────────────────────────────────────────────────────────

# Chạy toàn bộ test (unit + integration nếu có INTEGRATION=true)
test:
	go test ./... -v -race -count=1

# Chỉ chạy unit test (không cần DB, nhanh)
test-unit:
	go test ./tests/unit/... -v -race -count=1

# Chạy integration test — yêu cầu Docker đang chạy
test-integration:
	INTEGRATION=true go test ./tests/integration/... -v -count=1

## ── Lint ────────────────────────────────────────────────────────────────────

lint:
	golangci-lint run ./...

## ── Code generation ─────────────────────────────────────────────────────────

sqlc:
	sqlc generate

## ── Database migrations ──────────────────────────────────────────────────────

GOOSE_DSN ?= "host=localhost port=5432 user=postgres password=postgres dbname=generate_cv sslmode=disable"
GOOSE_DIR  = db/migrations

migrate-up:
	goose -dir $(GOOSE_DIR) postgres $(GOOSE_DSN) up

migrate-down:
	goose -dir $(GOOSE_DIR) postgres $(GOOSE_DSN) down

migrate-status:
	goose -dir $(GOOSE_DIR) postgres $(GOOSE_DSN) status

## ── Docker ──────────────────────────────────────────────────────────────────

docker-up:
	docker compose up -d

docker-down:
	docker compose down

docker-reset:
	docker compose down -v && docker compose up -d
