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

## [1.1.0] — 2026-04-14

### Added

#### Editor — Tab navigation & Markdown Session

- **`components/editor/EditorPanel.tsx`** — Refactor từ scroll dọc sang tab navigation
  - Mỗi section (Cá nhân, Tóm tắt, Kinh nghiệm...) là 1 tab riêng, click để chuyển
  - Tab **🎨 Màu** — color picker + 8 preset colors
  - Tab **Markdown** — mở custom markdown session (xem bên dưới)
  - Visibility toggle hiển thị ngay trong content area của từng tab

- **`components/editor/MarkdownEditor.tsx`** — Component mới: chỉnh sửa toàn bộ CV bằng markdown có cấu trúc
  - Serialize toàn bộ CV sections → markdown text khi mount
  - Nút **Áp dụng** parse markdown → update từng section vào store
  - Nút **Khôi phục** sync lại từ store (bỏ thay đổi chưa apply)
  - Nút **ℹ️** toggle hướng dẫn cú pháp inline với nút "Dùng mẫu này"
  - Status bar: số dòng · số ký tự · trạng thái chưa áp dụng
  - Chỉ apply khi user nhấn nút — không auto-parse khi gõ (tránh clobber)

- **`lib/cv-markdown.ts`** — Thư viện serialize/parse CV ↔ markdown
  - `serializeToMarkdown(sections)` → string markdown có cấu trúc
  - `parseMarkdown(md)` → `SectionPatch[]` để apply vào store
  - Hỗ trợ đầy đủ 8 section types: personal, summary, experience, education, skills, projects, certifications, languages
  - Pipe-separated lists cho arrays: `Go | PostgreSQL | Docker`
  - H2 blocks (`## Title — Subtitle`) cho list items

#### Bug fixes
- **`components/editor/EditorLayout.tsx`** — Đổi left panel từ `overflow-y-auto` sang `flex flex-col overflow-hidden` để MarkdownEditor fill đúng height

---

## [1.2.0] — 2026-04-14

### Added

#### Editor — Settings tab, Template picker, Custom Section

- **`components/editor/EditorPanel.tsx`** — Thêm 2 tab mới vào tab bar:
  - **Tab ⚙️ (Settings)** — đổi tên CV, chọn màu chủ đạo (picker + 8 preset), chọn template khác ngay trong editor không cần tạo lại CV
  - **Tab + Thêm** — thêm section chuẩn còn thiếu (Experience, Education...) hoặc tạo custom section tự do
  - Standard sections có thể xóa bằng nút Trash trong header của từng tab (trừ `personal`)
  - Custom section dùng `section.id` làm tab key — hỗ trợ nhiều custom section cùng lúc

- **`components/editor/sections/CustomSection.tsx`** *(mới)* — Editor cho custom section:
  - Chỉnh sửa tên section inline
  - Danh sách bullet points tự do (thêm / xóa từng dòng)
  - Nút "Xóa section này" ở cuối

- **`store/editorStore.ts`** — Thêm 2 action:
  - `addSection(section)` — thêm section mới vào cuối danh sách
  - `removeSection(sectionId)` — xóa section khỏi CV

- **`components/editor/EditorLayout.tsx`** — Đổi title input thành `<span>` read-only (việc đổi tên CV chuyển vào Settings tab)

---

[1.0.0]: https://github.com/yourname/generate-cv/releases/tag/v1.0.0
