.PHONY: run test test-unit test-integration lint sqlc \
        migrate-up migrate-down migrate-status \
        docker-up docker-down docker-reset

## ── Dev ──────────────────────────────────────────────────────────────────────

run:
	go run ./cmd/server/...

## ── Test ─────────────────────────────────────────────────────────────────────

test:
	go test ./... -v -race -count=1

test-unit:
	go test ./tests/unit/... -v -race -count=1

test-integration:
	INTEGRATION=true go test ./tests/integration/... -v -count=1

## ── Lint ─────────────────────────────────────────────────────────────────────

lint:
	golangci-lint run ./...

## ── Code generation ──────────────────────────────────────────────────────────

sqlc:
	sqlc generate

## ── Database migrations (chạy trong Docker, không cần cài goose trên host) ───

migrate-up:
	docker compose run --rm migrate

migrate-down:
	docker compose run --rm migrate -dir /migrations down

migrate-status:
	docker compose run --rm migrate -dir /migrations status

## ── Docker ───────────────────────────────────────────────────────────────────

# Khởi động postgres + redis (không chạy migrate tự động)
docker-up:
	docker compose up -d postgres redis

# Khởi động + migrate luôn một lệnh
docker-up-migrate:
	docker compose up -d postgres redis
	docker compose run --rm migrate

docker-down:
	docker compose down

# Xoá toàn bộ volume, khởi động lại sạch
docker-reset:
	docker compose down -v
	docker compose up -d postgres redis
	docker compose run --rm migrate
