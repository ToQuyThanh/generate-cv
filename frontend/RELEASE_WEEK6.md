# Release — Tuần 6: Profile System — Phase 2 Frontend

**Ngày:** Tháng 4/2026
**Phase:** Phase 2 — Profile System Frontend (plan_profile.md)
**Trạng thái:** ✅ Hoàn thành

---

## Tóm tắt

Tuần 6 implement toàn bộ **frontend cho Profile-first model** theo `plan_profile.md § Phase 2`.
Build trên nền backend Phase 1 (tuần 5), frontend thêm:

- **2 Zustand stores** mới: `profileStore` + `profileEditorStore`
- **2 trang mới**: `/profiles` (danh sách) + `/profiles/[id]` (editor)
- **Sidebar update**: nav item "Dữ liệu CV" với badge đếm profiles
- **`/cv/new` update**: flow 2 bước — chọn profile → chọn template
- **Types mở rộng**: đầy đủ Profile type system
- **API client mới**: `profileApi` với 15 method
- **4 test files mới**, tổng **45+ test cases**

---

## Files mới / đã thay đổi

| File | Thay đổi |
|---|---|
| `types/index.ts` | ✅ CẬP NHẬT — thêm `CVProfile`, `ProfileSection`, `ProfileItem`, `*ItemData` schemas, request types |
| `lib/api/profile.ts` | ✅ MỚI — `profileApi`: 15 methods (profiles CRUD, sections, items, reorder) |
| `lib/api/index.ts` | ✅ CẬP NHẬT — export `profileApi` |
| `store/profileStore.ts` | ✅ MỚI — quản lý profiles list, CRUD actions, loading/error state |
| `store/profileEditorStore.ts` | ✅ MỚI — editor state: load profile, meta save, section/item CRUD, optimistic updates |
| `store/index.ts` | ✅ CẬP NHẬT — export 2 stores mới |
| `components/shared/Sidebar.tsx` | ✅ CẬP NHẬT — thêm nav "Dữ liệu CV" (Database icon) + badge count |
| `app/(dashboard)/profiles/page.tsx` | ✅ MỚI — ProfilesPage: grid + ProfileCard + CreateModal + EmptyState |
| `app/(dashboard)/profiles/[id]/page.tsx` | ✅ MỚI — ProfileEditorPage: PersonalInfo + SectionBlock + ItemCard forms |
| `app/(dashboard)/cv/new/page.tsx` | ✅ CẬP NHẬT — 2-step flow, StepIndicator, ProfileSelector, profile_id trong CreateCV |
| `__tests__/profileStore.test.ts` | ✅ MỚI — 18 test cases |
| `__tests__/profileEditorStore.test.ts` | ✅ MỚI — 18 test cases |
| `__tests__/profiles-page.test.tsx` | ✅ MỚI — 12 test cases (render, modal, navigation) |
| `__tests__/new-cv-page-profile.test.ts` | ✅ MỚI — 17 test cases (step flow, profile selection, request building) |

---

## Types mới — `types/index.ts`

```typescript
// Core profile entities
CVProfile            — full profile với sections[]
CVProfileListItem    — lightweight cho list view
ProfileSection       — section trong profile (+ items[])
ProfileItem          — item trong section

// Item data schemas (JSONB)
WorkExperienceItemData
EducationItemData
SkillsItemData
ProjectItemData
CertificationItemData

// Request types
CreateProfileRequest, UpdateProfileRequest
CreateSectionRequest, UpdateSectionRequest
CreateItemRequest, UpdateItemRequest
ReorderRequest

// CV updates
CV.profile_id, CV.profile_snapshot, CV.overrides   ← fields mới
CreateCVRequest.profile_id                          ← truyền profile khi tạo CV
```

---

## API Client — `lib/api/profile.ts`

15 methods map 1-1 với backend endpoints tuần 5:

```
profileApi.list()                                   GET /profiles
profileApi.get(id)                                  GET /profiles/:id
profileApi.create(body)                             POST /profiles
profileApi.update(id, body)                         PUT /profiles/:id
profileApi.delete(id)                               DELETE /profiles/:id
profileApi.setDefault(id)                           PATCH /profiles/:id/default
profileApi.listSections(profileId)                  GET /profiles/:id/sections
profileApi.createSection(profileId, body)           POST /profiles/:id/sections
profileApi.updateSection(profileId, sId, body)      PUT /profiles/:id/sections/:sId
profileApi.deleteSection(profileId, sId)            DELETE /profiles/:id/sections/:sId
profileApi.reorderSections(profileId, body)         PATCH /profiles/:id/sections/reorder
profileApi.createItem(pId, sId, body)               POST /profiles/:id/sections/:sId/items
profileApi.updateItem(pId, sId, iId, body)          PUT /profiles/:id/sections/:sId/items/:iId
profileApi.deleteItem(pId, sId, iId)                DELETE /profiles/:id/sections/:sId/items/:iId
profileApi.reorderItems(pId, sId, body)             PATCH /profiles/:id/sections/:sId/items/reorder
```

---

## Zustand Stores

### `profileStore.ts`

```typescript
interface ProfileState {
  profiles:       CVProfileListItem[]
  activeProfile:  CVProfile | null
  loading:        boolean
  error:          string | null

  fetchProfiles:  () => Promise<void>
  fetchProfile:   (id) => Promise<CVProfile>
  createProfile:  (data) => Promise<CVProfile>
  updateProfile:  (id, data) => Promise<void>
  deleteProfile:  (id) => Promise<void>
  setDefault:     (id) => Promise<void>
  setActiveProfile: (profile | null) => void
  reset:          () => void
}
```

**Behaviors nổi bật:**
- `createProfile` prepend profile mới vào đầu list
- `deleteProfile` tự clear `activeProfile` nếu bị xóa
- `setDefault` toggle `is_default` trên toàn bộ list (chỉ 1 default)

### `profileEditorStore.ts`

```typescript
interface ProfileEditorState {
  profile:        CVProfile | null
  sections:       ProfileSection[]
  isDirty:        boolean
  isSaving:       boolean
  lastSavedAt:    Date | null

  loadProfile:    (id) => Promise<void>
  updateMeta:     (data) => void           // optimistic, sets isDirty
  saveMeta:       () => Promise<void>      // PUT /profiles/:id
  addSection:     (data) => Promise<void>
  updateSection:  (sId, data) => void      // optimistic
  removeSection:  (sId) => Promise<void>
  reorderSections:(ids[]) => Promise<void> // optimistic
  addItem:        (sId, data) => Promise<void>
  updateItem:     (sId, iId, data) => void // optimistic
  saveItem:       (sId, iId) => Promise<void>
  removeItem:     (sId, iId) => Promise<void>
  reorderItems:   (sId, ids[]) => Promise<void> // optimistic
  reset:          () => void
}
```

**Pattern:** Tất cả reorder và visibility toggle dùng **optimistic update** — UI cập nhật ngay, API call chạy background.

---

## Trang mới

### `/profiles` — ProfilesPage

```
ProfilesPage
├── Header (Dữ liệu CV label + title + profile count + Tạo profile button)
├── Loading skeleton
├── EmptyState (khi chưa có profile)
└── ProfileGrid
    └── ProfileCard ×N
        ├── Avatar icon + Name + role_target
        ├── full_name + email meta
        ├── "Mặc định" badge (nếu is_default)
        ├── section_count
        ├── updated_at (relative time, tiếng Việt)
        ├── Context menu (MoreHorizontal)
        │   ├── Chỉnh sửa → /profiles/:id
        │   ├── Đặt làm mặc định
        │   ├── Tạo CV từ profile → /cv/new?profile_id=:id
        │   └── Xóa (với confirm dialog)
        └── "Chỉnh sửa →" quick link

CreateProfileModal
├── Tên profile * (required)
├── Vị trí mục tiêu (optional)
└── Submit → POST /profiles → redirect /profiles/:id
```

### `/profiles/[id]` — ProfileEditorPage

```
ProfileEditorPage
├── TopBar (sticky)
│   ├── Back → /profiles
│   ├── Profile name + role_target
│   ├── SaveStatus ("Đã lưu" / "Đang lưu..." / "Chưa lưu")
│   └── "Tạo CV từ profile" button
│
└── Content (max-w-3xl)
    ├── PersonalInfoSection (always visible)
    │   ├── Profile name + role_target (editable)
    │   ├── full_name, email, phone, location
    │   ├── linkedin_url, github_url, website_url
    │   └── summary (textarea)
    │
    ├── SectionBlock ×N (collapsible)
    │   ├── Header: drag handle + title + eye toggle + delete + collapse
    │   └── ItemCard ×N (collapsible)
    │       ├── Header: drag handle + summary + eye toggle + delete + expand
    │       └── Form (theo section type)
    │           ├── work_experience: WorkExpItemForm
    │           ├── education: EducationItemForm
    │           ├── skills: SkillsItemForm (tag input)
    │           └── default: GenericItemForm (key-value)
    │
    └── "Thêm section mới" button → AddSectionModal
        └── 7 section types: work_experience, education, skills,
            projects, certifications, languages, custom
```

### `/cv/new` — Updated Flow

**Trước:** Vào thẳng chọn template + màu → tạo CV

**Sau:** 2-step flow với StepIndicator

```
Step 1: Chọn profile
├── StepIndicator (Chọn profile → Chọn template)
├── ProfileSelectorStep
│   ├── "Không dùng profile" card (selectedId = null)
│   ├── ProfileCard ×N (từ profileStore)
│   └── "Tạo profile mới" card → /profiles
└── Nút "Tiếp theo →"

Step 2: Chọn template
├── Profile summary banner (nếu đã chọn profile)
│   └── "Thay đổi" → quay lại step 1
├── Màu chủ đạo (giữ nguyên)
├── Template grid + filter tabs (giữ nguyên)
└── Nút "Tạo CV"
    └── POST /cvs với profile_id (nếu có)
```

**`?profile_id=` query param:** Nếu navigate từ ProfileCard → "Tạo CV từ profile", page tự động bỏ qua step 1 và nhảy thẳng sang step 2 với profile đã chọn.

---

## Sidebar Update

```
navItems = [
  { href: '/dashboard',  label: 'Dashboard',    icon: LayoutDashboard },
  { href: '/profiles',   label: 'Dữ liệu CV',   icon: Database,   showBadge: true }, ← MỚI
  { href: '/cv/new',     label: 'Tạo CV mới',   icon: PlusCircle },
]
```

Badge: hiển thị số profile, tự fetch `profileApi.list()` khi sidebar mount.
Badge styling: active → `bg-white/20 text-white`, inactive → `bg-blue-10% text-wf-blue`.

---

## Design System compliance

Tuân thủ `design.md` — Webflow-inspired:
- `wf-blue` (`#146ef5`) cho primary actions + active states
- `wf-border` (`#d8d8d8`) cho borders
- `wf-black` (`#080808`) cho primary text
- `wf-gray-*` cho muted/secondary text
- `wf-label` class (uppercase, 10px, wide letter-spacing) cho section labels
- `shadow-wf` (5-layer cascade) cho modals + hover cards
- `rounded` = 4px, `rounded-lg` = 8px — conservative radius
- Transition `duration-150` trên tất cả interactive elements

---

## Tests

### Chạy tests mới

```bash
# Tất cả profile tests
npx vitest run __tests__/profileStore.test.ts __tests__/profileEditorStore.test.ts __tests__/profiles-page.test.tsx __tests__/new-cv-page-profile.test.ts

# Toàn bộ test suite
npx vitest run
```

### Test coverage

| File | Test cases | Coverage |
|---|---|---|
| `profileStore.test.ts` | 18 | fetchProfiles, fetchProfile, createProfile, updateProfile, deleteProfile, setDefault, setActiveProfile, reset |
| `profileEditorStore.test.ts` | 18 | loadProfile, updateMeta, saveMeta, addSection, updateSection, removeSection, reorderSections, addItem, updateItem, removeItem, reorderItems, reset |
| `profiles-page.test.tsx` | 12 | render, empty state, loading, profile list, create modal, navigation |
| `new-cv-page-profile.test.ts` | 17 | step navigation, profile selection, CreateCVRequest building, profile banner logic |
| **Tổng** | **65** | |

---

## Checklist tuần 6

- [x] `types/index.ts` — Profile type system đầy đủ (CVProfile, Section, Item, ItemData schemas, request types)
- [x] `lib/api/profile.ts` — 15 API methods
- [x] `lib/api/index.ts` — export profileApi
- [x] `store/profileStore.ts` — CRUD + loading/error + setDefault + optimistic list updates
- [x] `store/profileEditorStore.ts` — load + meta save + section/item CRUD + optimistic reorder
- [x] `store/index.ts` — export cả 2 stores mới
- [x] `components/shared/Sidebar.tsx` — "Dữ liệu CV" nav + Database icon + badge
- [x] `app/(dashboard)/profiles/page.tsx` — ProfilesPage full (grid, card, modal, empty state)
- [x] `app/(dashboard)/profiles/[id]/page.tsx` — ProfileEditorPage (personal info, sections, items, forms)
- [x] `app/(dashboard)/cv/new/page.tsx` — 2-step flow + StepIndicator + ProfileSelector
- [x] `__tests__/profileStore.test.ts` — 18 test cases
- [x] `__tests__/profileEditorStore.test.ts` — 18 test cases
- [x] `__tests__/profiles-page.test.tsx` — 12 test cases
- [x] `__tests__/new-cv-page-profile.test.ts` — 17 test cases

---

## Tổng routes sau tuần 6

| Route | Mô tả |
|---|---|
| `/dashboard` | Danh sách CV documents |
| `/profiles` | **[MỚI]** Danh sách CV profiles |
| `/profiles/:id` | **[MỚI]** Profile editor |
| `/cv/new` | **[CẬP NHẬT]** 2-step: profile → template |
| `/cv/:id` | CV editor (override model — Phase 4) |

---

## Tuần tiếp theo (Tuần 7 — Phase 3: Upload Pipeline)

- Backend: upload endpoint + BullMQ job + parse worker
- Frontend: UploadModal 4-step flow
- Polling hook `useUploadStatus`
- AI extraction prompt + schema validation
- Review & import parsed data vào profile
