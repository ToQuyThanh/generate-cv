# Tech Stack — Web Làm CV (Việt Nam)

> Lựa chọn công nghệ tối ưu cho team nhỏ (1–2 người), chi phí thấp, scale được khi cần.

---

## Frontend

| Hạng mục | Công nghệ | Lý do chọn |
|---|---|---|
| Framework | **Next.js 14** (App Router) | SSR/SSG tốt cho SEO, file-based routing, React ecosystem |
| Language | **TypeScript** | Type-safe, dễ maintain khi codebase lớn dần |
| Styling | **Tailwind CSS** | Nhanh, nhất quán, không cần viết CSS thuần |
| UI Components | **shadcn/ui** | Customizable, không lock-in, dùng Radix UI bên dưới |
| State Management | **Zustand** | Nhẹ, đơn giản, đủ dùng cho editor CV |
| CV Editor | **React-based custom editor** | Drag & drop section, real-time preview |
| PDF Preview | **react-pdf** | Render PDF preview trực tiếp trên browser |
| Form | **React Hook Form + Zod** | Validation mạnh, ít re-render |
| Icons | **Lucide React** | Nhẹ, consistent, MIT license |

---

## Backend

| Hạng mục | Công nghệ | Lý do chọn |
|---|---|---|
| Language | **Go (Golang)** | Hiệu năng cao, binary nhỏ, phù hợp deploy on-prem |
| Framework | **Gin** hoặc **Echo** | Nhẹ, mature, routing nhanh, nhiều middleware sẵn |
| Database | **PostgreSQL** | Relational, ổn định, phù hợp cả GCP lẫn on-prem |
| ORM / Query Builder | **sqlc** + **pgx** | Type-safe SQL, không magic, hiệu năng tốt |
| Auth | **JWT** + Google OAuth2 | Tự quản lý, không phụ thuộc third-party auth |
| PDF Export | **Chromium headless** (via go-rod) | Export PDF pixel-perfect, chạy được trên server riêng |
| AI Integration | **Anthropic Claude API** | Hiểu tiếng Việt tốt, gợi ý nội dung CV theo JD |
| File Storage | **GCS (Google Cloud Storage)** | Lưu CV template, PDF export, tích hợp tốt với GCP |
| Email | **Resend** | Free 3,000 email/tháng, API đơn giản |
| Queue / Background Job | **Asynq** + Redis | Go-native job queue, xử lý export PDF bất đồng bộ |

---

## Payment

| Hạng mục | Công nghệ | Lý do chọn |
|---|---|---|
| Nội địa | **VNPay + MoMo** | Phủ rộng thị trường VN, không cần thẻ quốc tế |
| Quốc tế (tương lai) | **Stripe** | Khi mở rộng ra thị trường ngoài VN |
| Subscription Logic | **Custom** (lưu trong DB) | Kiểm soát hoàn toàn gói tuần / gói tháng |

---

## Infrastructure & DevOps

| Hạng mục | Công nghệ | Lý do chọn |
|---|---|---|
| Frontend Hosting | **GCP Cloud Run** | Serverless, tự scale, tích hợp tốt với GCP ecosystem |
| Backend Hosting | **On-premise Server** | Kiểm soát hoàn toàn, tiết kiệm chi phí dài hạn |
| Database Hosting | **On-premise** (PostgreSQL) | Dữ liệu người dùng nằm trong hạ tầng tự quản lý |
| Object Storage | **GCS** (Google Cloud Storage) | Lưu PDF, template, assets tĩnh |
| CDN | **Cloudflare** (free) | Cache static assets, bảo vệ DDoS cơ bản |
| CI/CD | **GitHub Actions** | Tự động test + build; deploy lên on-prem qua SSH |
| Container | **Docker + Docker Compose** | Đóng gói backend Go, dễ deploy lên on-prem |
| Monitoring | **Sentry** (free tier) + **Prometheus + Grafana** | Bắt lỗi production + theo dõi metrics server on-prem |
| Analytics | **Plausible** hoặc **Google Analytics** | Theo dõi traffic SEO |

---

## Cấu trúc thư mục

```
generate-cv/
├── frontend/                  # Next.js App
│   ├── app/                   # App Router pages
│   ├── components/            # UI components
│   ├── lib/                   # Utilities, hooks
│   └── public/                # Static assets
│
└── backend/                   # Go API Server
    ├── cmd/
    │   └── server/            # Entry point (main.go)
    ├── internal/
    │   ├── handler/           # HTTP handlers (Gin/Echo routes)
    │   ├── service/           # Business logic (AI, PDF, payment)
    │   ├── repository/        # DB queries (sqlc generated)
    │   └── worker/            # Asynq background jobs
    ├── db/
    │   ├── migrations/        # SQL migration files
    │   └── queries/           # sqlc query files
    ├── Dockerfile
    └── docker-compose.yml
```

---

## Chi phí hạ tầng hàng tháng (giai đoạn MVP)

| Dịch vụ | Chi phí |
|---|---|
| GCP Cloud Run (frontend) | ~$0–5/tháng (free tier rộng) |
| On-premise server (backend + DB) | Chi phí điện + internet (~100–200k VND) |
| GCS (file storage) | ~$0–2/tháng (<10GB) |
| Resend (email) | Miễn phí (<3,000 email/tháng) |
| Claude API (AI) | ~$20/tháng (~500k VND) |
| Cloudflare | Miễn phí |
| **Tổng ước tính** | **~$25–30/tháng (~600–750k VND)** |

> On-premise giúp tiết kiệm chi phí hosting backend và database đáng kể so với cloud thuần.

---

*Cập nhật: Tháng 4/2026*
