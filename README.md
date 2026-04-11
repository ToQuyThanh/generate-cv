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

## Cấu trúc dự án

```
generate-cv/
│
├── frontend/                          # Next.js 14 · TypeScript · Tailwind CSS
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── login/                 # Trang đăng nhập
│   │   │   └── register/              # Trang đăng ký
│   │   ├── (dashboard)/
│   │   │   ├── dashboard/             # Trang chủ sau đăng nhập — danh sách CV
│   │   │   ├── cv/
│   │   │   │   ├── new/               # Tạo CV mới — chọn template
│   │   │   │   └── [id]/              # Editor CV theo ID
│   │   │   └── settings/              # Cài đặt tài khoản, subscription
│   │   ├── api/
│   │   │   └── webhook/               # Webhook nhận callback VNPay / MoMo
│   │   └── pricing/                   # Trang giá — so sánh gói, CTA mua
│   │
│   ├── components/
│   │   ├── cv/                        # CVCard, CVPreview, TemplateGallery
│   │   ├── editor/                    # EditorPanel, SectionBlock, DragHandle
│   │   ├── payment/                   # PricingCard, PaymentModal, SubscriptionBadge
│   │   ├── shared/                    # Header, Footer, Sidebar, LoadingSpinner
│   │   └── ui/                        # shadcn/ui components (Button, Dialog, …)
│   │
│   ├── lib/
│   │   ├── api/                       # Axios client, API call functions
│   │   ├── hooks/                     # useCV, useSubscription, useEditor
│   │   └── utils/                     # Format date, slugify, cn()
│   │
│   ├── store/                         # Zustand stores — editorStore, authStore
│   ├── types/                         # TypeScript interfaces — CV, User, Subscription
│   └── public/
│       ├── fonts/                     # Font tải về (Be Vietnam Pro, …)
│       └── templates/                 # Ảnh thumbnail preview template
│
└── backend/                           # Go (Gin) · PostgreSQL · Asynq
    ├── cmd/
    │   └── server/                    # main.go — entry point, khởi động server
    │
    ├── internal/                      # Logic không export ra ngoài package
    │   ├── handler/                   # HTTP handlers — nhận request, trả response
    │   ├── service/                   # Business logic — xử lý nghiệp vụ chính
    │   ├── repository/                # Truy vấn DB (sqlc generated)
    │   ├── middleware/                # Auth JWT, rate limit, CORS, logger
    │   ├── model/                     # Struct Go map với DB schema
    │   └── worker/                    # Asynq task handlers — xử lý job bất đồng bộ
    │
    ├── pkg/                           # Thư viện dùng chung, có thể tái sử dụng
    │   ├── ai/                        # Claude API client — gợi ý nội dung CV
    │   ├── pdf/                       # go-rod headless Chrome — export PDF
    │   ├── payment/                   # VNPay + MoMo SDK wrapper
    │   ├── email/                     # Resend client — gửi email thông báo
    │   └── storage/                   # GCS client — upload / download file
    │
    ├── db/
    │   ├── migrations/                # SQL migration files (goose)
    │   └── queries/                   # sqlc query files (.sql)
    │
    └── config/                        # Load env, cấu hình app, DB, Redis
```

---

## Hạ tầng

```
                    ┌─────────────┐
                    │ Cloudflare  │  CDN + DDoS protection
                    └──────┬──────┘
                           │
              ┌────────────┴────────────┐
              │                         │
    ┌─────────▼──────────┐   ┌──────────▼─────────┐
    │  GCP Cloud Run      │   │  On-premise Server  │
    │  (Next.js Frontend) │   │  (Go API + Redis)   │
    └────────────────────┘   └──────────┬──────────┘
                                         │
                             ┌───────────▼───────────┐
                             │  On-premise PostgreSQL  │
                             └───────────────────────┘
                                         │
                             ┌───────────▼──────────┐
                             │  GCS (File Storage)   │
                             └──────────────────────┘
```

| Thành phần | Công nghệ | Nơi chạy |
|---|---|---|
| Frontend | Next.js 14 | GCP Cloud Run |
| Backend API | Go + Gin | On-premise |
| Database | PostgreSQL | On-premise |
| Job Queue | Asynq + Redis | On-premise |
| File Storage | Google Cloud Storage | GCP |
| CDN + Security | Cloudflare | Cloud |
| CI/CD | GitHub Actions | Cloud |

---

## Luồng chính

```
User tạo CV → Chọn template → Điền nội dung (AI gợi ý theo JD)
           → Preview real-time → Export PDF
           → Nếu Free: PDF có watermark → Hiện paywall
           → Mua gói → VNPay / MoMo → Webhook xác nhận
           → Mở khóa export PDF sạch
```

---

## Tài liệu

| File | Nội dung |
|---|---|
| [`techstack.md`](./techstack.md) | Chi tiết công nghệ, lý do chọn, chi phí hạ tầng |
| [`function_list.md`](./function_list.md) | Danh sách toàn bộ API endpoints và chức năng frontend |

---

## Getting Started

```bash
# Frontend
cd frontend
npm install
npm run dev        # http://localhost:3000

# Backend
cd backend
go mod tidy
go run cmd/server/main.go   # http://localhost:8080

# DB migration
cd backend
goose -dir db/migrations postgres "$DATABASE_URL" up
```

---

*Tháng 4/2026 · Thị trường Việt Nam*
