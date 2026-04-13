# Tech Stack — generate-cv (Việt Nam)

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
| Form | **React Hook Form + Zod** | Validation mạnh, ít re-render |
| Icons | **Lucide React** | Nhẹ, consistent, MIT license |
| Test | **Vitest + React Testing Library** | Nhanh, tích hợp tốt với Vite/Next.js |

---

## Template System (CV)

> **Triết lý: Template-as-Code** — mỗi template là một React component độc lập,
> DB chỉ lưu metadata (id, name, is_premium, tags). Layout và style nằm trong code.

| Hạng mục | Công nghệ / Cách làm | Lý do chọn |
|---|---|---|
| Template component | **React (TSX)** + inline style hoặc Tailwind | Render pixel-perfect trong browser và khi export PDF |
| Template registry | `templates/registry.ts` — map `template_id → component` | Single source of truth, thêm template = thêm 1 file |
| Template props | Interface `TemplateProps` chung: `sections`, `colorTheme`, `width` | Mọi template đều dùng cùng props, dễ swap |
| Thumbnail | Cùng component, scale down CSS `transform: scale()` | Không cần ảnh tĩnh, thumbnail luôn đúng với layout thật |
| Metadata | `templates/{name}/meta.ts` — id, name, isPremium, tags, defaultColor | Đồng bộ với seed DB qua script |
| Thêm template mới | Tạo folder + component + meta → đăng ký vào registry | Không cần thay đổi backend |
| DB seed | Script `scripts/seed-templates.ts` đọc registry → gọi `UpsertTemplate` | DB luôn đồng bộ với code |
| Gating premium | Registry expose `isPremium` → frontend check subscription | Không cần query DB riêng |

### Cấu trúc thư mục template

```
frontend/templates/
├── types.ts              ← TemplateProps interface + data helpers
├── registry.ts           ← map template_id → { component, meta }
├── modern/
│   ├── index.tsx         ← layout component (single-column, header màu)
│   └── meta.ts           ← { id: 'template_modern_01', name: 'Modern', ... }
├── classic/
│   ├── index.tsx
│   └── meta.ts
├── minimal/
│   ├── index.tsx
│   └── meta.ts
├── sidebar/              ← template 2 cột (sidebar trái)
│   ├── index.tsx
│   └── meta.ts
└── ...                   ← thêm template mới chỉ cần thêm folder
```

### Quy trình thêm template mới

```
1. Tạo  frontend/templates/{tên}/meta.ts      ← điền id, isPremium, tags, defaultColor
2. Tạo  frontend/templates/{tên}/index.tsx    ← viết layout React
3. Đăng ký vào  frontend/templates/registry.ts
4. Chạy  npm run seed:templates               ← sync DB (upsert)
5. Done — thumbnail tự sinh, không cần ảnh
```

---

## Backend

| Hạng mục | Công nghệ | Lý do chọn |
|---|---|---|
| Language | **Go (Golang)** | Hiệu năng cao, binary nhỏ, phù hợp deploy on-prem |
| Framework | **Gin** | Nhẹ, mature, routing nhanh, nhiều middleware sẵn |
| Database | **PostgreSQL** | Relational, ổn định, phù hợp cả GCP lẫn on-prem |
| ORM / Query Builder | **sqlc** + **pgx** | Type-safe SQL, không magic, hiệu năng tốt |
| Auth | **JWT** + Google OAuth2 | Tự quản lý, không phụ thuộc third-party auth |
| PDF Export | **Chromium headless** (via go-rod) | Export PDF pixel-perfect, chạy được trên server riêng |
| AI Integration | **Anthropic Claude API** | Hiểu tiếng Việt tốt, gợi ý nội dung CV theo JD |
| File Storage | **GCS (Google Cloud Storage)** | Lưu CV template, PDF export, tích hợp tốt với GCP |
| Email | **Resend** | Free 3,000 email/tháng, API đơn giản |
| Queue / Background Job | **Asynq** + Redis | Go-native job queue, xử lý export PDF bất đồng bộ |
| Migration | **goose** | CLI đơn giản, hỗ trợ up/down, idempotent |
| Template DB | `templates` table — chỉ lưu metadata | Layout nằm ở frontend, DB không biết đến CSS |

### Template API (backend chỉ lo metadata)

```
GET  /templates          → list { id, name, thumbnail_url, is_premium, tags }
GET  /templates/:id      → detail 1 template
```

Backend **không** biết đến layout hay style của template. Mọi logic render đều ở frontend.

---

## Payment

| Hạng mục | Công nghệ | Lý do chọn |
|---|---|---|
| Nội địa | **VNPay + MoMo** | Phủ rộng thị trường VN, không cần thẻ quốc tế |
| Quốc tế (tương lai) | **Stripe** | Khi mở rộng ra thị trường ngoài VN |
| Subscription Logic | **Custom** (lưu trong DB) | Kiểm soát hoàn toàn gói tuần / gói tháng |
| Giá | Weekly: 49.000đ · Monthly: 149.000đ | Config trong `config.go` qua env var |

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
├── frontend/
│   ├── app/
│   │   ├── (auth)/            # /login, /register
│   │   ├── (dashboard)/       # /dashboard, /cv/[id], /settings
│   │   ├── pricing/           # /pricing
│   │   └── payment/result/    # /payment/result
│   ├── components/
│   │   ├── cv/                # CVCard, CVMiniPreview
│   │   ├── editor/            # EditorLayout, EditorPanel, sections/
│   │   ├── payment/           # PaywallModal
│   │   └── shared/            # Sidebar
│   ├── templates/             ← Template-as-Code
│   │   ├── types.ts           # TemplateProps interface
│   │   ├── registry.ts        # map id → component
│   │   ├── modern/            # layout + meta
│   │   ├── classic/
│   │   └── ...
│   ├── lib/
│   │   ├── api/               # axios client + endpoint wrappers
│   │   ├── hooks/             # useAutoSave, ...
│   │   └── utils/             # formatDate, getPlanLabel, ...
│   ├── store/                 # Zustand stores (auth, editor)
│   └── types/                 # TypeScript interfaces
│
└── backend/
    ├── cmd/server/            # main.go
    ├── internal/
    │   ├── handler/           # HTTP handlers
    │   ├── service/           # Business logic
    │   ├── repository/        # DB queries (sqlc)
    │   ├── middleware/        # auth, cors, ratelimit, logger
    │   ├── router/            # Gin engine setup
    │   ├── routes/            # route registration per domain
    │   ├── model/             # request/response structs
    │   ├── cron/              # subscription expiry
    │   └── worker/tasks/      # asynq task handlers
    ├── db/
    │   ├── migrations/        # SQL migration files (goose)
    │   └── queries/           # sqlc query files
    ├── pkg/
    │   ├── ai/                # Claude API client
    │   ├── payment/           # VNPay, MoMo providers
    │   ├── pdf/               # go-rod PDF export
    │   ├── storage/           # GCS client
    │   ├── email/             # Resend client
    │   ├── jwtutil/
    │   └── redisutil/
    └── docker-compose.yml
```

---

## Chi phí hạ tầng hàng tháng (MVP)

| Dịch vụ | Chi phí |
|---|---|
| GCP Cloud Run (frontend) | ~$0–5/tháng (free tier rộng) |
| On-premise server (backend + DB) | Chi phí điện + internet (~100–200k VND) |
| GCS (file storage) | ~$0–2/tháng (<10GB) |
| Resend (email) | Miễn phí (<3,000 email/tháng) |
| Claude API (AI) | ~$20/tháng (~500k VND) |
| Cloudflare | Miễn phí |
| **Tổng ước tính** | **~$25–30/tháng (~600–750k VND)** |

---

*Cập nhật: Tháng 4/2026*
