# Release — Tuần 5: Profile System — Phase 1 Backend

**Ngày:** Tháng 4/2026
**Phase:** Phase 1 — Profile System (plan_profile.md)
**Trạng thái:** ✅ Hoàn thành

---

## Tóm tắt

Tuần 5 implement toàn bộ backend cho **Profile-first model** theo `plan_profile.md`.
Hệ thống chuyển từ mỗi CV là tài liệu độc lập sang mô hình:

```
User → CV Profiles (bộ dữ liệu) → CV Documents (nhiều CV từ 1 profile)
```

Bao gồm: migration DB, repository, service, handler, router wiring,
cập nhật CV service để hỗ trợ `profile_id` + `profile_snapshot` + `overrides`,
và toàn bộ unit tests.

---

## Files mới / đã thay đổi

| File | Thay đổi |
|---|---|
| `db/migrations/008_profile_system.sql` | ✅ MỚI — 3 tables mới + ALTER cvs + indexes |
| `internal/model/profile.go` | ✅ MỚI — request/response structs cho Profile/Section/Item API |
| `internal/model/cv.go` | ✅ CẬP NHẬT — thêm `profile_id`, `profile_snapshot`, `overrides`, `UpdateCVOverridesRequest` |
| `internal/repository/profile.go` | ✅ MỚI — `ProfileRepository`: full CRUD + SetDefault + Reorder + ListItemsBySections |
| `internal/repository/cv.go` | ✅ CẬP NHẬT — thêm profile columns, `UpdateOverrides`, `RefreshSnapshot`, `scanCV` helper |
| `internal/service/profile.go` | ✅ MỚI — `ProfileService`: 18 methods, ownership chain, `ProfileRepo` interface |
| `internal/service/cv.go` | ✅ CẬP NHẬT — `NewCVService` nhận `ProfileRepo`, `buildProfileSnapshot`, `UpdateOverrides`, `SyncProfile` |
| `internal/handler/profile.go` | ✅ MỚI — `ProfileHandler`: 14 HTTP handlers |
| `internal/handler/cv.go` | ✅ CẬP NHẬT — thêm `UpdateOverrides`, `SyncProfile` handlers; `CVServiceIface` mở rộng |
| `internal/router/router.go` | ✅ CẬP NHẬT — wire `profileRepo`, `profileSvc`, `profileHandler`; đăng ký tất cả routes |
| `internal/service/profile_test.go` | ✅ MỚI — 18 test cases |
| `internal/service/cv_test.go` | ✅ CẬP NHẬT — cập nhật mock signature, thêm 3 test cases mới |
| `Makefile` | ✅ CẬP NHẬT — thêm `test-profile`, `test-week5` |

---

## Database — Migration 008

### Tables mới

```sql
cv_profiles          — bộ dữ liệu CV của user (personal info + meta)
cv_profile_sections  — section trong profile (work, edu, skills, projects...)
cv_profile_items     — item trong section (1 công ty, 1 trường, 1 skill group)
```

### ALTER TABLE cvs

```sql
ADD COLUMN profile_id       UUID REFERENCES cv_profiles(id) ON DELETE SET NULL
ADD COLUMN profile_snapshot JSONB   -- snapshot tại thời điểm tạo CV
ADD COLUMN overrides        JSONB   -- override data từ editor
```

**Backward compatible:** 3 columns nullable / default — CVs cũ không bị ảnh hưởng.

---

## Endpoints đã implement

### Profile API (yêu cầu JWT)

| Method | Path | Mô tả |
|---|---|---|
| GET    | `/api/v1/profiles`                                          | List tất cả profiles |
| POST   | `/api/v1/profiles`                                          | Tạo profile mới |
| GET    | `/api/v1/profiles/:id`                                      | Get profile đầy đủ (+ sections + items) |
| PUT    | `/api/v1/profiles/:id`                                      | Update profile meta |
| DELETE | `/api/v1/profiles/:id`                                      | Xóa profile + cascade |
| PATCH  | `/api/v1/profiles/:id/default`                              | Set làm default profile |
| GET    | `/api/v1/profiles/:id/sections`                             | List sections |
| POST   | `/api/v1/profiles/:id/sections`                             | Tạo section |
| PUT    | `/api/v1/profiles/:id/sections/:sectionId`                  | Update section |
| DELETE | `/api/v1/profiles/:id/sections/:sectionId`                  | Xóa section |
| PATCH  | `/api/v1/profiles/:id/sections/reorder`                     | Reorder sections |
| POST   | `/api/v1/profiles/:id/sections/:sectionId/items`            | Tạo item |
| PUT    | `/api/v1/profiles/:id/sections/:sectionId/items/:itemId`    | Update item |
| DELETE | `/api/v1/profiles/:id/sections/:sectionId/items/:itemId`    | Xóa item |
| PATCH  | `/api/v1/profiles/:id/sections/:sectionId/items/reorder`    | Reorder items |

### CV API — endpoints mới

| Method | Path | Mô tả |
|---|---|---|
| PUT  | `/api/v1/cvs/:id/overrides`     | Save override data từ editor |
| POST | `/api/v1/cvs/:id/sync-profile`  | Refresh snapshot từ profile hiện tại |

### CV API — `POST /api/v1/cvs` (updated)

Request body nhận thêm `profile_id` (optional):

```json
{
  "title": "Ứng tuyển MoMo",
  "template_id": "template_modern_01",
  "color_theme": "#1a56db",
  "profile_id": "uuid-of-profile"   ← MỚI, optional
}
```

Khi có `profile_id` → tự động tạo `profile_snapshot` tại thời điểm tạo CV.

---

## Quyết định kỹ thuật

| Quyết định | Lựa chọn | Lý do |
|---|---|---|
| Ownership chain | profile → section → item | Mọi thao tác item đều verify qua profile → section → item, tránh IDOR |
| `profile_id` optional trong POST /cvs | Backward compatible | CVs cũ không cần profile, không breaking change |
| Snapshot tại thời điểm tạo | JSONB trong `cvs.profile_snapshot` | CV không bị mất khi profile sau này bị xóa/sửa |
| `overrides` tách riêng | Không đụng snapshot | Editor chỉ ghi vào overrides, profile_snapshot là immutable sau khi tạo |
| `SetDefault` trong transaction | `BEGIN` → unset all → set one → `COMMIT` | Đảm bảo chỉ có 1 default tại mọi thời điểm |
| `scanCV` helper | const column list + shared scan func | DRY — tránh lặp 8-column scan ở 3 queries khác nhau |
| `ListItemsBySections` batch | `WHERE section_id = ANY($1)` | 1 query thay vì N queries khi load full profile |
| Reorder dùng transaction | Loop UPDATE trong tx | Đảm bảo atomicity, không bị partial reorder |

---

## Chạy tests

```bash
# Profile service tests
make test-profile

# Tất cả Phase 1 profile (profile + cv service)
make test-week5

# Toàn bộ unit tests
make test-unit
```

---

## Checklist tuần 5

- [x] Migration `008_profile_system.sql` — 3 tables + ALTER cvs + indexes
- [x] `model/profile.go` — đầy đủ request/response types + SectionType constants
- [x] `model/cv.go` — thêm profile_id, profile_snapshot, overrides, UpdateCVOverridesRequest
- [x] `repository/profile.go` — ProfileRepository full CRUD + SetDefault + Reorder + Batch load
- [x] `repository/cv.go` — thêm profile columns, UpdateOverrides, RefreshSnapshot, scanCV helper
- [x] `service/profile.go` — ProfileService + ProfileRepo interface + 18 methods + ownership chain
- [x] `service/cv.go` — tích hợp ProfileRepo, buildProfileSnapshot, UpdateOverrides, SyncProfile
- [x] `handler/profile.go` — 14 HTTP handlers với đầy đủ error handling
- [x] `handler/cv.go` — thêm UpdateOverrides, SyncProfile; mở rộng CVServiceIface
- [x] `router/router.go` — wire toàn bộ profile routes + 2 CV routes mới
- [x] `service/profile_test.go` — 18 test cases (CRUD profile, section, item, ownership, cross-profile)
- [x] `service/cv_test.go` — cập nhật mock + 3 test cases mới (overrides, sync, profile_id)
- [x] `Makefile` — thêm `test-profile`, `test-week5`

---

## Tổng endpoints sau tuần 5

| Nhóm | Số endpoints |
|---|---|
| Auth | 8 |
| CV | 8 (+2 mới) |
| User | 4 |
| Template | 2 |
| **Profile** | **15 (MỚI)** |
| **Tổng** | **37** |

---

## Tuần tiếp theo (Tuần 6 — Phase 2 Frontend)

- `profileStore.ts` + `profileEditorStore.ts`
- `/profiles` page — list + ProfileCard
- `/profiles/[id]` — ProfileEditorPage
- Sidebar update: tab "Dữ liệu CV"
- Update `/cv/new` — step chọn profile trước template
