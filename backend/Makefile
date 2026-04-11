.PHONY: run test test-unit test-integration lint sqlc \
        migrate-up migrate-down migrate-status \
        docker-up docker-down docker-reset \
        install-tools

## ── Tool paths (prefer local bin, fallback to PATH) ─────────────────────────

GOBIN  := $(shell go env GOPATH)/bin
GOOSE  := $(GOBIN)/goose
SQLC   := $(GOBIN)/sqlc

## ── Install dev tools ────────────────────────────────────────────────────────

install-tools:
	@echo "→ Installing goose..."
	go install github.com/pressly/goose/v3/cmd/goose@latest
	@echo "→ Installing sqlc..."
	go install github.com/sqlc-dev/sqlc/cmd/sqlc@latest
	@echo "✓ Tools installed to $(GOBIN)"
	@echo "  Add to PATH if needed: export PATH=\$$PATH:$(GOBIN)"

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

sqlc: $(SQLC)
	$(SQLC) generate

## ── Database migrations ──────────────────────────────────────────────────────

GOOSE_DSN ?= "host=localhost port=5432 user=postgres password=postgres dbname=generate_cv sslmode=disable"
GOOSE_DIR  = db/migrations

$(GOOSE):
	@echo "→ goose not found, installing..."
	go install github.com/pressly/goose/v3/cmd/goose@latest

migrate-up: $(GOOSE)
	$(GOOSE) -dir $(GOOSE_DIR) postgres $(GOOSE_DSN) up

migrate-down: $(GOOSE)
	$(GOOSE) -dir $(GOOSE_DIR) postgres $(GOOSE_DSN) down

migrate-status: $(GOOSE)
	$(GOOSE) -dir $(GOOSE_DIR) postgres $(GOOSE_DSN) status

## ── Docker ───────────────────────────────────────────────────────────────────

docker-up:
	docker compose up -d

docker-down:
	docker compose down

docker-reset:
	docker compose down -v && docker compose up -d
