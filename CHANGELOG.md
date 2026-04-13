# Changelog — generate-cv

Tất cả thay đổi đáng kể sẽ được ghi lại ở đây.
Định dạng theo [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).
Phiên bản theo [Semantic Versioning](https://semver.org/).

---

## [1.0.0] — 2026-04-13

### 🎉 Phiên bản đầu tiên — Production-ready Docker deployment

Đây là phiên bản đóng gói đầu tiên của toàn bộ stack generate-cv,
sẵn sàng deploy lên on-premise server bằng Docker Compose.

---

### Added

#### Infrastructure / DevOps
- **`backend/Dockerfile`** — Multi-stage build Go (builder → alpine runtime)
  - Stage 1: `golang:1.22-alpine` — compile binary tĩnh, CGO disabled
  - Stage 2: `alpine:3.19` — runtime tối giản, non-root user (`appuser:1001`)
  - Healthcheck tích hợp (`wget /health`)
  - Binary stripped (`-ldflags="-w -s"`) giảm size ~70%

- **`frontend/Dockerfile`** — 3-stage Next.js build (deps → builder → runner)
  - Stage 1: `node:20-alpine` — cài production dependencies
  - Stage 2: build Next.js với `output: standalone`
  - Stage 3: runtime tối giản, non-root user (`nextjs:1001`)
  - Build args cho `NEXT_PUBLIC_*` variables
  - Healthcheck tích hợp

- **`docker-compose.yml`** (root) — Orchestrate toàn bộ production stack
  - 5 services: `postgres`, `redis`, `migrate`, `backend`, `frontend`
  - Phân tách 2 Docker networks: `backend_net` (DB + API) và `frontend_net` (FE + API)
  - `postgres` và `redis` không expose port ra host — chỉ truy cập nội bộ
  - `backend` bind `127.0.0.1:8080` — chỉ Nginx local có thể reach
  - `migrate` service (goose) chạy một lần rồi exit, `backend` đợi migrate xong
  - Health check đầy đủ cho mọi service với `depends_on` condition
  - Redis cấu hình `maxmemory 256mb` + `allkeys-lru` policy

- **`.env.example`** (root) — Template biến môi trường production
  - Tất cả biến bắt buộc được đánh dấu `[REQUIRED]`
  - Comment giải thích từng biến
  - Bao gồm cả biến backend lẫn `NEXT_PUBLIC_*` frontend

- **`backend/.dockerignore`** — Loại trừ: `.env*`, `tests/`, `docs/`, `*.md`
- **`frontend/.dockerignore`** — Loại trừ: `node_modules/`, `.next/`, `.env*`, `__tests__/`
- **`.dockerignore`** (root) — Loại trừ: `.git/`, `.env*`, `node_modules/`, `frontend/.next/`

#### Frontend
- **`frontend/next.config.js`** — Thêm `output: 'standalone'`
  - Bắt buộc để Dockerfile stage 3 chỉ copy `standalone/` thay vì toàn bộ `node_modules`
  - Giảm image size từ ~1GB xuống ~200MB

#### Documentation — gom vào `docs/`
- **`docs/README.md`** — Index tài liệu dự án
- **`docs/architecture.md`** — Sơ đồ hạ tầng, Docker network topology, port summary
- **`docs/deployment.md`** — Hướng dẫn deploy đầy đủ:
  - System requirements
  - Step-by-step deploy
  - Update phiên bản mới
  - Backup / restore PostgreSQL
  - Nginx reverse proxy config mẫu
  - Troubleshooting guide
  - Security checklist production
- **`docs/design.md`** — Design system (moved từ root)
- **`docs/techstack.md`** — Tech stack (moved từ root)
- **`docs/function-list.md`** — API & frontend functions (moved từ root)
- **`docs/plan.md`** — Lộ trình phát triển (moved từ root)
- **`docs/plan-profile.md`** — Profile system plan (moved từ root)
- **`docs/openapi.yaml`** — OpenAPI spec (moved từ root)

---

### Security

- PostgreSQL không expose port ra ngoài Docker host
- Redis không expose port ra ngoài Docker host
- Backend chỉ bind `127.0.0.1` (không phải `0.0.0.0`)
- Non-root user trong tất cả containers (`uid 1001`)
- `.env` files bị loại khỏi tất cả `.dockerignore`
- Phân tách network: DB layer không thể reach được từ frontend container

---

### Migration path

Đây là phiên bản đầu tiên — không có migration path từ phiên bản cũ.

**Để chạy lần đầu:**
```bash
cp .env.example .env
# Điền các biến [REQUIRED]

docker compose build
docker compose up -d
```

---

### Known limitations v1.0.0

- Frontend phải build lại toàn bộ khi thay đổi `NEXT_PUBLIC_*` variables (Next.js build-time baking)
- Chưa có CI/CD pipeline tự động — deploy thủ công qua SSH
- Chưa có Prometheus metrics endpoint tích hợp vào compose
- Nginx config phải cấu hình riêng ngoài Docker Compose

---

### What's next — v1.1.0 (planned)

- [ ] GitHub Actions CI: test → build → push image lên registry
- [ ] Deploy script SSH tự động
- [ ] Nginx container tích hợp vào docker-compose với Let's Encrypt
- [ ] Health dashboard endpoint tổng hợp status tất cả dependencies
- [ ] Log aggregation (Loki hoặc file-based)

---

[1.0.0]: https://github.com/yourname/generate-cv/releases/tag/v1.0.0
