.PHONY: run test test-unit test-integration \
        test-service test-handler test-jwt test-middleware test-cv \
        lint sqlc \
        migrate-up migrate-down migrate-status \
        docker-up docker-down docker-reset

## ── Dev ──────────────────────────────────────────────────────────────────────

run:
	go run ./cmd/server/...

## ── Test ─────────────────────────────────────────────────────────────────────

# Run all tests
test:
	go test ./... -v -race -count=1

# Unit tests only (no DB needed)
test-unit:
	go test ./internal/service/... ./internal/handler/... ./internal/middleware/... ./pkg/jwtutil/... -v -race -count=1

# Integration tests (requires Docker DB)
test-integration:
	INTEGRATION=true go test ./tests/integration/... -v -count=1

# Granular targets
test-service:
	go test ./internal/service/... -v -race -count=1

test-handler:
	go test ./internal/handler/... -v -race -count=1

test-jwt:
	go test ./pkg/jwtutil/... -v -race -count=1

test-middleware:
	go test ./internal/middleware/... -v -race -count=1

# Week 3 shorthand
test-cv:
	go test ./internal/service/... ./internal/handler/... -run TestCV -v -race -count=1

## ── Lint ─────────────────────────────────────────────────────────────────────

lint:
	golangci-lint run ./...

## ── Code generation ──────────────────────────────────────────────────────────

sqlc:
	sqlc generate

## ── Database migrations ──────────────────────────────────────────────────────

migrate-up:
	docker compose run --rm migrate

migrate-down:
	docker compose run --rm migrate -dir /migrations down

migrate-status:
	docker compose run --rm migrate -dir /migrations status

## ── Docker ───────────────────────────────────────────────────────────────────

docker-up:
	docker compose up -d postgres redis

docker-up-migrate:
	docker compose up -d postgres redis
	docker compose run --rm migrate

docker-down:
	docker compose down

docker-reset:
	docker compose down -v
	docker compose up -d postgres redis
	docker compose run --rm migrate
