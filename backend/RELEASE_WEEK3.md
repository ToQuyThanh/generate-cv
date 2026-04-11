# Release — Tuần 3: CV API

**Ngày:** Tháng 4/2026
**Phase:** Phase 1 — Backend Core
**Trạng thái:** ✅ Hoàn thành

---

## Tóm tắt

Tuần 3 implement toàn bộ CV CRUD API với ownership check, pagination, và duplicate.
Mọi endpoint CV đều yêu cầu JWT. Ownership sai trả 404 (không phải 403) để không
lộ sự tồn tại của resource. Sections lưu dạng JSONB opaque — backend không validate
nội dung bên trong, frontend toàn quyền quyết định shape.

---

## Files mới / đã thay đổi

| File | Thay đổi |
|---|---|
| `db/queries/cvs.sql` | ✅ Thêm `CountCVsByUser` |
| `internal/model/cv.go` | ✅ MỚI — CreateCVRequest, UpdateCVRequest, ListCVsQuery, CVResponse, ListCVsResponse |
| `internal/repository/cv.go` | ✅ MỚI — CVRepository: Create, GetByID, ListByUser, CountByUser, UpdateFields, Delete |
| `internal/service/cv.go` | ✅ MỚI — CVService: List, Create, Get, Update, Delete, Duplicate |
| `internal/handler/cv.go` | ✅ MỚI — CVHandler: 6 HTTP handlers |
| `internal/router/router.go` | ✅ CẬP NHẬT — wire CV routes dưới `/api/v1/cvs` |
| `internal/service/cv_test.go` | ✅ MỚI — 13 test cases |
| `internal/handler/cv_test.go` | ✅ MỚI — 13 test cases |
| `Makefile` | ✅ CẬP NHẬT — thêm `test-cv` target |

---

## Endpoints đã implement

| Method | Path | Auth | Mô tả |
|---|---|---|---|
| GET    | `/api/v1/cvs`              | ✅ JWT | List CVs của user, có pagination |
| POST   | `/api/v1/cvs`              | ✅ JWT | Tạo CV mới |
| GET    | `/api/v1/cvs/:id`          | ✅ JWT | Lấy CV (verify ownership) |
| PATCH  | `/api/v1/cvs/:id`          | ✅ JWT | Partial update (title/template/color/sections) |
| DELETE | `/api/v1/cvs/:id`          | ✅ JWT | Xóa CV |
| POST   | `/api/v1/cvs/:id/duplicate`| ✅ JWT | Clone CV, append " (bản sao)" vào title |

---

## Quyết định kỹ thuật

- **Ownership = 404:** `GET/PATCH/DELETE/duplicate` CV của người khác trả 404, không phải 403 — tránh lộ sự tồn tại của resource
- **JSONB opaque:** `sections` backend không validate nội dung bên trong — linh hoạt cho mọi loại section block
- **Pagination:** mặc định page=1, per_page=10, tối đa per_page=50
- **Duplicate title:** append " (bản sao)", truncate tại 200 ký tự nếu title gốc dài
- **Sections nil:** khi create không truyền sections → default `[]`
- **UpdateFields:** chỉ cập nhật field nào được truyền vào (partial update thực sự)

---

## Chạy tests

```bash
# Chỉ CV tests
make test-cv

# Tất cả unit tests
make test-unit

# Specific
go test ./internal/service/... -run TestCVService -v
go test ./internal/handler/... -run TestCVHandler -v
```

---

## Checklist tuần 3

- [x] `GET /cvs` — list có pagination (page, per_page, total, total_pages)
- [x] `POST /cvs` — tạo CV, sections default `[]`
- [x] `GET /cvs/:id` — lấy CV, verify ownership → 404 nếu sai
- [x] `PATCH /cvs/:id` — partial update title/template/color/sections
- [x] `DELETE /cvs/:id` — xóa CV, verify ownership
- [x] `POST /cvs/:id/duplicate` — clone, append "(bản sao)", truncate title
- [x] Unit test service — 13 test cases (mock repo, không cần DB)
- [x] Unit test handler — 13 test cases (httptest + mock service)

---

## Tuần tiếp theo (Tuần 4)

- `GET /users/me` + `PATCH /users/me` + `DELETE /users/me`
- `GET /users/me/subscription`
- `GET /templates` + `GET /templates/:id`
- Seed data: 3 template free + 5 template premium
- Middleware `RateLimit` (Redis sliding window)
- Middleware `RequestLogger` + `Recover`
- Viết README trong `backend/`
