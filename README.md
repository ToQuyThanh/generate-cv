# generate-cv

> Web làm CV chuyên nghiệp cho người dùng Việt Nam — Freemium Subscription Model.

---

## Giới thiệu

Ứng dụng cho phép người dùng tạo CV đẹp, chuyên nghiệp với giao diện tiếng Việt hoàn toàn. AI phân tích Job Description và gợi ý nội dung phù hợp. Xuất PDF không watermark là lý do chính để trả tiền.

| Gói | Giá | Nội dung |
|---|---|---|
| Free | Miễn phí | 3 template, export PDF có watermark |
| Gói Tuần | ~40,000 VND | 20+ template, PDF sạch, AI features |
| Gói Tháng | ~150,000 VND | Tất cả tính năng, hỗ trợ ưu tiên 24h |

Thanh toán qua **VNPay / MoMo** — không cần thẻ quốc tế.

---

## 🚀 Deploy nhanh (Docker Compose)

```bash
# 1. Clone project
git clone https://github.com/yourname/generate-cv.git
cd generate-cv

# 2. Tạo file env và điền giá trị thật
cp .env.example .env
nano .env   # Điền các biến [REQUIRED]

# 3. Build và khởi động toàn bộ stack
docker compose build
docker compose up -d

# 4. Kiểm tra
curl http://localhost:8080/health   # {"status":"ok"}
curl http://localhost:3000          # Next.js frontend
```

Xem hướng dẫn đầy đủ tại [`docs/deployment.md`](./docs/deployment.md).

---

## Cấu trúc dự án

```
generate-cv/
│
├── docker-compose.yml                 # Production stack (5 services)
├── .env.example                       # Template biến môi trường
├── CHANGELOG.md                       # Lịch sử thay đổi
│
├── docs/                              # Toàn bộ tài liệu dự án
│   ├── architecture.md                # Sơ đồ hạ tầng, Docker networks
│   ├── deployment.md                  # Hướng dẫn deploy production
│   ├── design.md                      # Design system
│   ├── techstack.md                   # Tech stack & lý do chọn
│   ├── function-list.md               # API endpoints & frontend screens
│   ├── plan.md                        # Lộ trình phát triển
│   ├── plan-profile.md                # Kế hoạch Profile System
│   └── openapi.yaml                   # OpenAPI 3.x spec
│
├── frontend/                          # Next.js 14 · TypeScript · Tailwind CSS
│   ├── Dockerfile                     # Multi-stage build (3 stages)
│   ├── app/
│   │   ├── (auth)/login|register/
│   │   ├── (dashboard)/dashboard|cv|settings/
│   │   ├── api/webhook/
│   │   └── pricing/
│   ├── components/
│   │   ├── cv/                        # CVCard, CVPreview, TemplateGallery
│   │   ├── editor/                    # EditorPanel, SectionBlock
│   │   ├── payment/                   # PricingCard, PaymentModal
│   │   ├── shared/                    # Header, Sidebar
│   │   └── ui/                        # shadcn/ui components
│   ├── lib/api/                       # Axios client + API modules
│   ├── store/                         # Zustand: authStore, editorStore
│   └── types/                         # TypeScript interfaces
│
└── backend/                           # Go (Gin) · PostgreSQL · Redis
    ├── Dockerfile                     # Multi-stage build Go
    ├── docker-compose.yml             # Dev-only: postgres + redis + migrate
    ├── cmd/server/main.go             # Entry point
    ├── internal/
    │   ├── handler/                   # HTTP handlers
    │   ├── service/                   # Business logic
    │   ├── repository/                # DB access (sqlc)
    │   ├── middleware/                # Auth JWT, RateLimit, CORS
    │   └── router/                    # Gin router + DI wiring
    ├── pkg/
    │   ├── ai/                        # Claude API client
    │   ├── payment/                   # VNPay + MoMo
    │   ├── pdf/                       # go-rod PDF export
    │   └── email/                     # Resend email
    └── db/
        ├── migrations/                # goose SQL migrations
        └── queries/                   # sqlc query files
```

---

## Development local

```bash
# Khởi động PostgreSQL + Redis (không chạy app trong Docker)
cd backend
make docker-up       # postgres + redis
make migrate-up      # chạy migrations

# Backend
make run             # http://localhost:8080

# Frontend (terminal khác)
cd frontend
cp .env.local.example .env.local
npm install
npm run dev          # http://localhost:3000
```

---

## Tài liệu

| File | Nội dung |
|---|---|
| [`docs/deployment.md`](./docs/deployment.md) | Hướng dẫn deploy production với Docker |
| [`docs/architecture.md`](./docs/architecture.md) | Sơ đồ hạ tầng và Docker network |
| [`docs/techstack.md`](./docs/techstack.md) | Chi tiết công nghệ, lý do chọn, chi phí |
| [`docs/function-list.md`](./docs/function-list.md) | Danh sách API endpoints và màn hình |
| [`docs/plan.md`](./docs/plan.md) | Lộ trình phát triển 6 tháng |
| [`docs/openapi.yaml`](./docs/openapi.yaml) | OpenAPI 3.x specification |
| [`CHANGELOG.md`](./CHANGELOG.md) | Lịch sử thay đổi phiên bản |

---

*v1.0.0 · Tháng 4/2026 · Thị trường Việt Nam*
