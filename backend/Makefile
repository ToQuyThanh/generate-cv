.PHONY: run test test-unit test-integration \
        test-service test-handler test-jwt test-middleware test-cv \
        test-user test-template test-week4 \
        test-payment test-payment-pkg test-cron test-week7 \
        test-profile test-week5 \
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
	go test ./internal/service/... ./internal/handler/... ./internal/middleware/... \
	    ./internal/cron/... ./pkg/jwtutil/... ./pkg/payment/... \
	    -v -race -count=1

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

# CV tests
test-cv:
	go test ./internal/service/... ./internal/handler/... -run TestCV -v -race -count=1

# Week 4 shortcuts
test-user:
	go test ./internal/service/... ./internal/handler/... -run TestUser -v -race -count=1

test-template:
	go test ./internal/service/... ./internal/handler/... -run TestTemplate -v -race -count=1

test-week4:
	go test ./internal/service/... ./internal/handler/... ./internal/middleware/... \
	    -run "TestUser|TestTemplate|TestRateLimit" -v -race -count=1

## ── Payment ──────────────────────────────────────────────────────────

test-payment:
	go test ./internal/service/... -run TestPayment -v -race -count=1

test-payment-pkg:
	go test ./pkg/payment/... -v -race -count=1

test-cron:
	go test ./internal/cron/... -v -race -count=1

test-week7:
	go test ./internal/service/... ./internal/cron/... ./pkg/payment/... \
	    -run "TestPayment|TestSubscriptionExpirer|TestVNPay|TestMoMo|TestIsVNPay|TestExtract|TestIsSuccess" \
	    -v -race -count=1

## ── Profile (Phase 1 — plan_profile) ─────────────────────────────────────────

# Profile service unit tests only
test-profile:
	go test ./internal/service/... -run TestProfile -v -race -count=1

# All Phase 1 profile-system tests: profile service + updated CV service
test-week5:
	go test ./internal/service/... \
	    -run "TestProfile|TestCV" \
	    -v -race -count=1

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
