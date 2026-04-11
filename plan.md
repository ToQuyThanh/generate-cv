# Kế hoạch phát triển — generate-cv

> Ưu tiên backend trước để có API ổn định, sau đó frontend tích hợp vào.
> Team: 1–2 người · Thời gian: 6 tháng · Mục tiêu MRR tháng 6: 25–40tr VND

---

## Tổng quan lộ trình

```
Tháng 1        Tháng 2        Tháng 3        Tháng 4        Tháng 5        Tháng 6
   │              │              │              │              │              │
   ├─── PHASE 1 ──┤              │              │              │              │
   │  Backend core│              │              │              │              │
   │  (Auth + CV) │              │              │              │              │
   │              ├─── PHASE 2 ──┤              │              │              │
   │              │  Backend full│              │              │              │
   │              │  (AI+Payment)│              │              │              │
   │              │    + FE MVP  │              │              │              │
   │              │              ├──── PHASE 3 ─┤              │              │
   │              │              │  Integration │              │              │
   │              │              │  + Payment   │              │              │
   │              │              │              ├──── PHASE 4 ─┤              │
   │              │              │              │  Polish + SEO│              │
   │              │              │              │              ├──── PHASE 5 ─┤
   │              │              │              │              │    Scale +   │
   │              │              │              │              │    Retention │
```

---

## Phase 1 — Backend Core (Tuần 1–4)

**Mục tiêu:** API Auth + CV hoàn chỉnh, có thể test bằng Postman / Scalar. Chưa cần frontend.

### Tuần 1 — Khởi tạo dự án & Database

**Setup:**
- [ ] Khởi tạo Go module: `go mod init github.com/yourname/generate-cv`
- [ ] Cài Gin + cấu hình router cơ bản
- [ ] Setup Docker Compose: PostgreSQL + Redis local
- [ ] Cấu hình `config/` đọc `.env` bằng `viper`
- [ ] Setup `sqlc.yaml`, viết schema SQL đầu tiên
- [ ] Cài `goose` cho database migration

**Database schema — migration đầu tiên:**
```sql
-- users
CREATE TABLE users (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email       TEXT UNIQUE NOT NULL,
  password    TEXT,                        -- null nếu đăng nhập Google
  full_name   TEXT NOT NULL,
  avatar_url  TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- refresh_tokens
CREATE TABLE refresh_tokens (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token       TEXT UNIQUE NOT NULL,
  expires_at  TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- subscriptions
CREATE TABLE subscriptions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan        TEXT NOT NULL DEFAULT 'free',   -- free | weekly | monthly
  status      TEXT NOT NULL DEFAULT 'active', -- active | expired | cancelled
  started_at  TIMESTAMPTZ,
  expires_at  TIMESTAMPTZ,
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- cvs
CREATE TABLE cvs (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title        TEXT NOT NULL DEFAULT 'CV của tôi',
  template_id  TEXT NOT NULL DEFAULT 'template_modern_01',
  color_theme  TEXT NOT NULL DEFAULT '#1a56db',
  sections     JSONB NOT NULL DEFAULT '[]',
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- templates
CREATE TABLE templates (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  thumbnail_url TEXT,
  preview_url   TEXT,
  is_premium    BOOLEAN NOT NULL DEFAULT FALSE,
  tags          TEXT[] DEFAULT '{}'
);
```

**Deliverable:** Docker Compose chạy được, migration thành công, `sqlc generate` ra code.

---

### Tuần 2 — Auth API

**Implement theo thứ tự:**

- [ ] `POST /auth/register` — hash password bằng `bcrypt`, tạo user + subscription free, trả JWT
- [ ] `POST /auth/login` — so sánh password, trả access token (15 phút) + refresh token (30 ngày)
- [ ] `POST /auth/refresh` — verify refresh token trong DB, cấp access token mới
- [ ] `POST /auth/logout` — xóa refresh token khỏi DB
- [ ] `POST /auth/forgot-password` — tạo reset token (UUID), lưu DB với TTL 1 giờ, gửi email
- [ ] `POST /auth/reset-password` — verify token, cập nhật password mới
- [ ] Middleware `AuthJWT` — parse Bearer token, inject `userID` vào Gin context
- [ ] Google OAuth2 — `GET /auth/google` redirect + `GET /auth/google/callback` xử lý

**Lưu ý kỹ thuật:**
- Access token: HS256, payload `{sub: userID, exp: now+15m}`
- Refresh token: random UUID lưu trong bảng `refresh_tokens`, không encode JWT
- Luôn trả HTTP 200 với `POST /auth/forgot-password` dù email không tồn tại (tránh user enumeration)

**Deliverable:** Test toàn bộ Auth flow bằng Postman collection, không có lỗi.

---

### Tuần 3 — CV API

- [ ] `GET /cvs` — query CVs của user, có pagination
- [ ] `POST /cvs` — tạo CV mới từ template, insert với sections mặc định theo template
- [ ] `GET /cvs/:id` — lấy CV, verify ownership (chỉ owner mới xem được)
- [ ] `PATCH /cvs/:id` — partial update title / template_id / color_theme / sections (JSONB)
- [ ] `DELETE /cvs/:id` — soft delete hoặc hard delete
- [ ] `POST /cvs/:id/duplicate` — clone bản ghi, thêm " (bản sao)" vào title

**Lưu ý kỹ thuật:**
- `sections` lưu dạng JSONB — không cần normalize, linh hoạt cho mọi loại section
- Mọi endpoint CV đều verify `user_id = cv.user_id`, trả 404 (không phải 403) nếu không phải owner
- Auto-save gọi `PATCH` liên tục — cân nhắc debounce 2 giây ở frontend

**Deliverable:** CRUD CV hoàn chỉnh, viết unit test cho service layer.

---

### Tuần 4 — User API + Template API + Hoàn thiện

- [ ] `GET /users/me` — trả user info kèm subscription
- [ ] `PATCH /users/me` — update full_name, avatar_url
- [ ] `DELETE /users/me` — xóa user, cascade xóa CVs và tokens
- [ ] `GET /users/me/subscription` — trả subscription detail
- [ ] `GET /templates` — list templates, filter theo `is_premium` và `tag`
- [ ] `GET /templates/:id` — detail template
- [ ] Seed data: 3 template free + 5 template premium vào DB
- [ ] Middleware `RateLimit` — dùng Redis, giới hạn theo `userID`
- [ ] Middleware `RequestLogger` + `Recover`
- [ ] Setup Sentry cho error tracking
- [ ] Viết `README` trong `backend/` hướng dẫn chạy local

**Deliverable:** Phase 1 API hoàn chỉnh. Export Postman collection. MRR: 0 (chưa có payment).

---

## Phase 2 — Backend AI + Payment + Export (Tuần 5–8)

**Mục tiêu:** Toàn bộ backend hoàn chỉnh. Song song bắt đầu frontend MVP.

### Tuần 5 — PDF Export (Background Job)

- [ ] Setup Asynq + Redis worker trong `internal/worker/`
- [ ] Cài go-rod, test render HTML → PDF local
- [ ] `POST /cvs/:id/export` — enqueue job `pdf:export`, trả `job_id`
- [ ] Worker `pdf:export`:
  1. Lấy CV data từ DB
  2. Render thành HTML (dùng Go `html/template`)
  3. go-rod chụp PDF
  4. Nếu user Free: overlay watermark
  5. Upload lên GCS
  6. Cập nhật trạng thái job vào Redis
- [ ] `GET /cvs/:id/export/:jobId` — poll trạng thái từ Redis, trả URL download khi done
- [ ] GCS client trong `pkg/storage/` — upload, tạo signed URL (TTL 15 phút)
- [ ] Migration: thêm bảng `export_jobs`

**Deliverable:** Export PDF end-to-end hoạt động, có watermark cho Free user.

---

### Tuần 6 — AI Integration

- [ ] Anthropic Claude API client trong `pkg/ai/`
- [ ] Middleware `RequireSubscription` — đọc subscription từ DB, chặn nếu plan = free
- [ ] `POST /ai/suggest-summary` — prompt engineering tiếng Việt, trả gợi ý giới thiệu bản thân
- [ ] `POST /ai/suggest-experience` — gợi ý mô tả kinh nghiệm theo công ty + vị trí
- [ ] `POST /ai/analyze-jd` — parse JD, trả keywords + missing_keywords + match_score + suggestions
- [ ] `POST /ai/rewrite-section` — rewrite đoạn văn theo tone chọn (professional / concise / impactful)
- [ ] Rate limit riêng cho AI endpoint: 20 req/phút/user bằng Redis sliding window
- [ ] Viết prompt template riêng cho từng endpoint, lưu trong `pkg/ai/prompts/`

**Lưu ý kỹ thuật:**
- Dùng `claude-sonnet-4-20250514`, max_tokens 1000, temperature 0.7
- Stream response nếu latency > 3 giây (Server-Sent Events)
- Log token usage để kiểm soát chi phí Claude API

**Deliverable:** 4 AI endpoint hoạt động, test bằng JD tiếng Việt thực tế.

---

### Tuần 7 — Payment Integration

**Migration:**
```sql
CREATE TABLE payment_transactions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id),
  plan          TEXT NOT NULL,       -- weekly | monthly
  method        TEXT NOT NULL,       -- vnpay | momo
  amount_vnd    INTEGER NOT NULL,
  status        TEXT NOT NULL DEFAULT 'pending', -- pending | success | failed | refunded
  provider_ref  TEXT,                -- mã giao dịch phía VNPay / MoMo
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  paid_at       TIMESTAMPTZ
);
```

- [ ] VNPay sandbox: `POST /payment/create` tạo URL, `GET /payment/vnpay/callback` xử lý redirect
- [ ] MoMo sandbox: `POST /payment/create` tạo URL, `POST /webhook/momo` xử lý IPN
- [ ] `POST /webhook/vnpay` — verify HMAC-SHA512, cập nhật transaction + subscription
- [ ] `POST /webhook/momo` — verify HMAC-SHA256 signature, cập nhật transaction + subscription
- [ ] `GET /payment/history` — lấy lịch sử giao dịch có pagination
- [ ] Sau khi webhook xác nhận: enqueue job `email:payment_success`
- [ ] Cron job `subscription:expire` — chạy mỗi giờ, hạ cấp tài khoản hết hạn

**Deliverable:** Test thanh toán end-to-end trên sandbox VNPay + MoMo.

---

### Tuần 8 — Email + Cron + Hardening

- [ ] Resend client trong `pkg/email/` — HTML email template cho từng loại
- [ ] Job `email:welcome` — gửi ngay sau register
- [ ] Job `email:payment_success` — gợi ý tính năng AI, link tạo CV
- [ ] Cron `email:subscription_expiring` — chạy mỗi ngày, nhắc user còn 3 ngày
- [ ] Cron `email:cv_reminder` — chạy mỗi 30 ngày, nhắc user cập nhật CV
- [ ] Setup Prometheus metrics endpoint `/metrics`
- [ ] Setup Grafana dashboard: request rate, error rate, job queue length, latency p99
- [ ] Viết integration test cho toàn bộ happy path
- [ ] Dockerfile production + GitHub Actions CI (test + build + push image)
- [ ] Script deploy SSH lên on-premise

**Deliverable:** Backend production-ready. CI/CD hoạt động. Monitoring dashboard lên.

---

## Phase 3 — Frontend MVP (Tuần 5–10, song song với Phase 2)

**Mục tiêu:** Giao diện đủ dùng để người thật trả tiền. Không cần đẹp hoàn hảo.

### Tuần 5–6 — Setup + Auth + Dashboard

- [ ] Khởi tạo Next.js 14 App Router + TypeScript + Tailwind + shadcn/ui
- [ ] Axios client trong `lib/api/` với interceptor tự refresh token
- [ ] `authStore` (Zustand): lưu user, token, subscription
- [ ] Trang `/login` và `/register` — form + Google OAuth button
- [ ] Trang `/dashboard` — danh sách CV dạng card, nút tạo mới
- [ ] Layout dashboard với sidebar, header, subscription badge

### Tuần 7–8 — CV Editor (Core)

- [ ] Trang `/cv/new` — chọn template, bấm Dùng → tạo CV rồi redirect vào editor
- [ ] `editorStore` (Zustand): cvData, isDirty, isSaving
- [ ] Layout editor 2 cột: panel trái + preview phải
- [ ] Các SectionBlock: Personal, Summary, Experience, Education, Skills
- [ ] Auto-save: debounce 2 giây sau khi user ngừng gõ, gọi `PATCH /cvs/:id`
- [ ] CV Preview render real-time theo template + color theme

### Tuần 9–10 — AI Panel + Export + Payment

- [ ] `AIAssistPanel` — JD input, gọi `/ai/analyze-jd`, hiển thị keywords + suggestions
- [ ] Nút "Gợi ý AI" trong từng SectionBlock — gọi endpoint tương ứng
- [ ] `ExportButton` — gọi `POST /cvs/:id/export`, poll status, hiển thị progress
- [ ] `PaywallModal` — hiện khi Free user bấm export, CTA mua gói
- [ ] Trang `/pricing` — bảng so sánh gói, chọn VNPay / MoMo, redirect thanh toán
- [ ] Trang `/payment/result` — xử lý callback, hiển thị thành công / thất bại
- [ ] Trang `/settings` — profile, đổi mật khẩu, thông tin subscription

**Deliverable cuối Phase 3:** Có thể tạo CV, dùng AI, export PDF, và trả tiền thật.

---

## Phase 4 — Polish & Launch (Tuần 11–16)

**Mục tiêu:** Tối ưu UX, SEO, và có người dùng thật trả tiền.

- [ ] Thêm 10+ template premium, thiết kế đẹp hơn
- [ ] Responsive mobile cho editor (xem preview, chỉnh sửa cơ bản)
- [ ] Tối ưu Core Web Vitals cho trang landing và `/pricing`
- [ ] Viết 10 bài SEO: "mẫu CV xin việc", "CV tiếng Việt", "CV cho fresher"...
- [ ] Referral program: chia sẻ link → người được giới thiệu và người chia sẻ đều được 3 ngày free
- [ ] Tính năng theo dõi ứng tuyển: thêm trạng thái nộp CV vào từng job
- [ ] A/B test pricing page: headline khác nhau, vị trí CTA
- [ ] Analytics: Plausible hoặc GA4, track funnel từ landing → register → export → payment
- [ ] Đăng bài trên các Facebook Group tìm việc VN, quay video TikTok demo

**Deliverable:** 50+ user đăng ký, 10+ user trả tiền, MRR 3–8tr VND.

---

## Phase 5 — Scale & Retention (Tuần 17–24)

**Mục tiêu:** Giảm churn, tăng LTV, nhắm thêm phân khúc HR.

- [ ] Nhắm phân khúc HR / headhunter: thêm tính năng tạo hàng loạt, quản lý nhiều CV ứng viên
- [ ] AI Cover Letter: viết thư xin việc theo JD + CV
- [ ] Export nhiều định dạng: DOCX ngoài PDF
- [ ] LinkedIn import: tự động điền CV từ profile LinkedIn (dùng scraping hoặc API)
- [ ] Dashboard analytics cho user: số lần CV được xem (nếu chia sẻ link)
- [ ] Tối ưu prompt AI để giảm token usage 20–30%
- [ ] Onboarding flow: checklist tạo CV đầu tiên trong 5 phút
- [ ] Push notification: TikTok / Facebook ads retargeting user đã vào web nhưng chưa đăng ký
- [ ] Chuẩn bị Stripe cho thị trường ngoài VN

**Deliverable:** MRR 25–40tr VND, churn < 15%/tháng.

---

## Tiêu chí hoàn thành mỗi Phase

| Phase | Definition of Done |
|---|---|
| Phase 1 | Toàn bộ Auth + CV + User + Template API test pass, Postman collection đầy đủ |
| Phase 2 | PDF export ra file, AI trả kết quả tiếng Việt ổn, payment sandbox thành công |
| Phase 3 | Người thật tạo được CV hoàn chỉnh + trả tiền thật qua MoMo hoặc VNPay |
| Phase 4 | 10 user trả tiền, SEO có traffic, TikTok có ít nhất 1 video > 5,000 view |
| Phase 5 | MRR 25tr+, có ít nhất 1 HR/headhunter dùng thường xuyên |

---

## Tài liệu tham khảo

### Go & Backend

| Tài liệu | Link | Dùng cho |
|---|---|---|
| Go official docs | https://go.dev/doc/ | Syntax, standard library |
| Gin framework | https://gin-gonic.com/docs/ | HTTP routing, middleware |
| sqlc docs | https://docs.sqlc.dev/ | Sinh code từ SQL query |
| pgx v5 | https://github.com/jackc/pgx | PostgreSQL driver |
| Asynq | https://github.com/hibiken/asynq | Background job queue |
| go-rod | https://go-rod.github.io/ | Headless Chrome, export PDF |
| goose migration | https://github.com/pressly/goose | Database migration |
| viper config | https://github.com/spf13/viper | Đọc config từ env / file |
| golang-jwt | https://github.com/golang-jwt/jwt | JWT encode / decode |
| golang.org/x/oauth2 | https://pkg.go.dev/golang.org/x/oauth2 | Google OAuth2 |
| go-redis | https://github.com/redis/go-redis | Redis client cho Asynq + rate limit |
| testify | https://github.com/stretchr/testify | Unit test assertions |

### Database

| Tài liệu | Link | Dùng cho |
|---|---|---|
| PostgreSQL 16 docs | https://www.postgresql.org/docs/16/ | SQL reference |
| JSONB operators | https://www.postgresql.org/docs/current/functions-json.html | Query JSONB sections |
| goose CLI | https://pressly.github.io/goose/ | Chạy migration |
| pgAdmin | https://www.pgadmin.org/ | GUI quản lý DB local |

### AI

| Tài liệu | Link | Dùng cho |
|---|---|---|
| Anthropic API docs | https://docs.anthropic.com/ | Claude API reference |
| Anthropic Go SDK | https://github.com/anthropics/anthropic-sdk-go | Official Go client |
| Prompt engineering guide | https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/overview | Viết prompt hiệu quả |
| Claude model names | https://docs.anthropic.com/en/docs/about-claude/models/ | Model string cập nhật |
| Token pricing | https://www.anthropic.com/pricing | Kiểm soát chi phí API |

### Payment

| Tài liệu | Link | Dùng cho |
|---|---|---|
| VNPay sandbox docs | https://sandbox.vnpayment.vn/apis/docs/thanh-toan-pay/ | Tích hợp VNPay |
| VNPay HMAC verify | https://sandbox.vnpayment.vn/apis/docs/bao-mat/ | Xác thực IPN |
| MoMo developer portal | https://developers.momo.vn/ | Tích hợp MoMo |
| MoMo payment API | https://developers.momo.vn/#/docs/en/aiov2/?id=payment-method | API tạo link thanh toán |

### Infrastructure & DevOps

| Tài liệu | Link | Dùng cho |
|---|---|---|
| Docker docs | https://docs.docker.com/ | Dockerfile, Compose |
| GCP Cloud Run | https://cloud.google.com/run/docs | Deploy frontend |
| GCS Go client | https://cloud.google.com/storage/docs/reference/libraries#client-libraries-install-go | Upload file lên GCS |
| Cloudflare docs | https://developers.cloudflare.com/ | DNS, CDN, DDoS |
| GitHub Actions | https://docs.github.com/en/actions | CI/CD pipeline |
| Prometheus Go | https://prometheus.io/docs/guides/go-application/ | Expose metrics |
| Grafana | https://grafana.com/docs/ | Dashboard monitoring |
| Sentry Go | https://docs.sentry.io/platforms/go/ | Error tracking |

### Email

| Tài liệu | Link | Dùng cho |
|---|---|---|
| Resend docs | https://resend.com/docs | Gửi email transactional |
| Resend Go SDK | https://github.com/resend/resend-go | Go client chính thức |

### Frontend (tham khảo khi đến Phase 3)

| Tài liệu | Link | Dùng cho |
|---|---|---|
| Next.js 14 App Router | https://nextjs.org/docs/app | Routing, SSR, metadata |
| Tailwind CSS | https://tailwindcss.com/docs | Utility classes |
| shadcn/ui | https://ui.shadcn.com/ | Component library |
| Zustand | https://docs.pmnd.rs/zustand | State management |
| React Hook Form | https://react-hook-form.com/ | Form handling |
| Zod | https://zod.dev/ | Schema validation |
| react-pdf | https://react-pdf.org/ | Render PDF preview |
| dnd-kit | https://dndkit.com/ | Drag & drop section trong editor |
| Axios | https://axios-http.com/docs | HTTP client |

### API Specification

| Tài liệu | Link | Dùng cho |
|---|---|---|
| OpenAPI 3.1 spec | https://spec.openapis.org/oas/v3.1.0 | Viết openapi.yaml |
| Scalar | https://scalar.com/ | Render UI từ openapi.yaml |
| Swagger Editor | https://editor.swagger.io/ | Validate YAML online |
| Postman | https://www.postman.com/ | Test API thủ công |

---

## Checklist trước khi deploy Production

- [ ] Đổi tất cả secret key ra khỏi `.env.example` (JWT secret, VNPay key, MoMo key, Claude API key)
- [ ] Bật HTTPS trên on-premise (Let's Encrypt + Nginx reverse proxy)
- [ ] Cloudflare proxy bật, tắt expose IP gốc
- [ ] PostgreSQL không expose public port, chỉ listen localhost
- [ ] Redis không expose public port, có password
- [ ] Rate limit bật trên tất cả endpoint, đặc biệt Auth và AI
- [ ] Sentry DSN trỏ đúng project production
- [ ] Test VNPay + MoMo với giao dịch thật (tài khoản merchant thật)
- [ ] Backup PostgreSQL tự động hàng ngày (cron `pg_dump` → upload GCS)
- [ ] Smoke test toàn bộ happy path trước khi announce

---

*Cập nhật: Tháng 4/2026*
