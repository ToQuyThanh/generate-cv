# Release Notes — Tuần 7 Frontend (CV Editor Core)

## Tổng quan
Tuần 7 hoàn thiện toàn bộ luồng tạo và chỉnh sửa CV: chọn template, editor 2 cột với auto-save, và CV preview real-time.

---

## Tính năng mới

### Trang `/cv/new` — Chọn template
- Grid hiển thị toàn bộ template từ `GET /templates`
- Preview màu chủ đạo real-time khi chọn color preset hoặc custom color
- Lock template premium cho free user với icon Crown + toast gợi ý nâng cấp
- Bấm "Dùng template này" → gọi `POST /cvs` với đủ required fields (`title`, `template_id`, `color_theme`) rồi redirect sang editor

### `editorStore` (Zustand)
- State: `cvData`, `isDirty`, `isSaving`, `lastSavedAt`, `isAIPanelOpen`
- Actions: `setCVData`, `updateTitle`, `updateColorTheme`, `updateTemplateId`, `updateSection`, `reorderSections`, `setSaving`, `markSaved`, `setAIPanelOpen`, `reset`

### `useAutoSave` hook
- Debounce 2 giây sau khi `isDirty = true`
- Gọi `PATCH /cvs/:id` với toàn bộ CV data
- Không block UI — lỗi lưu giữ `isDirty = true` để retry

### `EditorLayout` — Layout 2 cột
- Topbar: nút back, input title inline, save status (Đang lưu / Chưa lưu / Đã lưu), nút AI toggle, ExportButton
- Panel trái (`EditorPanel`): chỉnh sửa từng section + toggle visibility
- Panel giữa (`CVPreview`): preview A4 real-time
- Panel phải (optional `AIAssistPanel`): phân tích JD, gợi ý AI

### Section Blocks
- **PersonalSection**: 8 field cơ bản (họ tên, vị trí, email, phone, location, website, LinkedIn, GitHub)
- **SummarySection**: textarea + nút "Gợi ý AI" (gọi `POST /ai/suggest-summary`)
- **ExperienceSection**: accordion, thêm/xóa từng vị trí, checkbox "đang làm việc", gợi ý AI per item
- **EducationSection**: accordion, school/degree/field/GPA
- **SkillsSection**: tên kỹ năng + level 1-5 dạng dot indicator

### `CVPreview` — Real-time render
- Render A4 (595px) với header màu chủ đạo
- Hiển thị: personal contact info, summary, experience, education, skills
- Tự động ẩn section có `visible: false`
- Reactive với mọi thay đổi từ `editorStore`
- **Refactor**: wrapper mỏng bên trên `CVMiniPreview` với `containerWidth=595` (scale 1:1)

---

## Fixes & Corrections

### Endpoint alignment với backend
| Trước | Sau | Lý do |
|---|---|---|
| `params: { limit }` | `params: { per_page }` | Backend `ListCVsQuery` dùng `per_page` |
| `CreateCVRequest { title?, color_theme? }` | `{ title, template_id, color_theme }` tất cả required | Backend `binding:"required"` |
| `setAuth({ ...subscription })` | `setAuth({ user, access_token, refresh_token })` | Backend `AuthResponse` không có subscription |
| `authApi.logout(refreshToken)` | `authApi.logout()` (tự lấy từ localStorage) | Consistent với interceptor pattern |
| `import { DropdownMenu } from 'radix-ui'` | `import * as DropdownMenu from '@radix-ui/react-dropdown-menu'` | Đúng package name |

### Section Blocks không hiện khi tạo CV mới

**Root cause**: `POST /cvs` trong trang `/cv/new` không gửi kèm `sections` → backend tạo CV với `sections: []` → `EditorPanel` không có gì để render.

**Fix**: Thêm `lib/cv-template.ts` export hàm `getBlankSections()`, trả về 5 `CVSection` mặc định với data rỗng và `visible: true`. Truyền kết quả vào `CreateCVRequest` khi tạo CV mới.

| File | Thay đổi |
|---|---|
| `lib/cv-template.ts` | **Mới** — `getBlankSections()` sinh 5 sections (personal / summary / experience / education / skills) |
| `app/(dashboard)/cv/new/page.tsx` | Thêm `sections: getBlankSections()` vào body của `cvApi.create()` |

### Trang `/cv/new` trống khi API `/templates` lỗi hoặc trả rỗng

**Root cause**: State khởi tạo `templates = []` — nếu fetch lỗi hoặc backend chưa có template nào, grid hiển thị trống, user không chọn được gì.

**Fix**: Thêm `BLANK_TEMPLATE` (id `"blank"`, badge Mặc định) làm option cố định đầu danh sách. State khởi tạo `templates = [BLANK_TEMPLATE]`, fetch thành công thì merge `[BLANK_TEMPLATE, ...apiTemplates]`, fetch lỗi thì giữ nguyên. `selectedTemplate` default đổi từ `'template_modern_01'` → `'blank'`.

| File | Thay đổi |
|---|---|
| `app/(dashboard)/cv/new/page.tsx` | Thêm `BLANK_TEMPLATE` constant, sửa state khởi tạo, sửa fetch merge, sửa `selectedTemplate` default, template card dùng `CVMiniPreview` thự, color picker dùng icon `Pipette` + công thức conic-gradient rainbow |

### Template thumbnail và CVCard thumbnail dùng colored placeholder

**Root cause**: Template card và CVCard thumbnail chỉ hiển thị icon + đường kẻ giả — không phản ánh layout CV thật.

**Fix**: Tạo `CVMiniPreview` — render CV layout thật scale-down bằng CSS `transform: scale()`. Duy trì font size, padding, spacing gốc để thumbnail chính xác. `CVPreview` trong editor refactor thành thin wrapper `containerWidth=595`.

| File | Thay đổi |
|---|---|
| `components/cv/CVMiniPreview.tsx` | **Mới** — re-usable mini preview, nhận `sections` + `colorTheme` + `containerWidth` |
| `components/editor/CVPreview.tsx` | Refactor: wrapper bên trên `CVMiniPreview` |
| `components/cv/CVCard.tsx` | Thumbnail dùng `CVMiniPreview` thay placeholder |
| `types/index.ts` | `CVListItem` bổ sung field `sections: CVSection[]` |

### Auth flow
- Sau login/register: gọi thêm `GET /users/me/subscription` để lấy subscription, set vào store riêng
- `setAuth` không còn nhận `subscription` (backend không trả trong AuthResponse)

---

## Package mới cần cài

```bash
npm install @radix-ui/react-dropdown-menu @radix-ui/react-dialog @radix-ui/react-separator @radix-ui/react-label @radix-ui/react-avatar @radix-ui/react-slot
```

Loại bỏ package `radix-ui` (bundle tổng hợp không chuẩn) — dùng từng `@radix-ui/*` riêng.

---

## Tests
- `editorStore.test.ts`: 8 test cases bao phủ toàn bộ actions
- `CVPreview.test.tsx`: 6 test cases (null render, personal info, summary, skills, hidden section, real-time update)
- `authStore.test.ts`: 6 test cases cập nhật theo AuthResponse mới (không có subscription)
- `cv-template.test.ts`: 11 test cases — số lượng sections, thứ tự type/order, visible mặc định, UUID v4 hợp lệ, unique ids, fresh ids mỗi lần gọi, personal fields đủ 8, summary content rỗng, items rỗng cho experience/education/skills, immutability
- `new-cv-page-template.test.ts`: 9 test cases — BLANK_TEMPLATE constant, merge logic (API bình thường / rỗng / lỗi / no-duplicate), thứ tự giữ nguyên, selectedTemplate default
- `CVMiniPreview` — cần bổ sung test tuần sau khi có visual regression setup

---

## Cấu trúc file mới

```
frontend/
├── app/
│   └── (dashboard)/
│       ├── cv/
│       │   ├── new/page.tsx          ← Chọn template
│       │   └── [id]/page.tsx         ← Editor route
│       └── settings/page.tsx         ← Đã có từ trước, refactor
├── components/
│   ├── cv/
│   │   ├── CVCard.tsx
│   │   └── CVMiniPreview.tsx         ← Mới — shared thumbnail component
│   └── editor/
│       ├── EditorLayout.tsx
│       ├── EditorPanel.tsx
│       ├── CVPreview.tsx
│       ├── ExportButton.tsx          ← Implement tuần 8
│       ├── AIAssistPanel.tsx         ← Implement tuần 8
│       └── sections/
│           ├── PersonalSection.tsx
│           ├── SummarySection.tsx
│           ├── ExperienceSection.tsx
│           ├── EducationSection.tsx
│           └── SkillsSection.tsx
├── lib/
│   ├── cv-template.ts            ← Mới — blank sections cho CV mới
│   └── hooks/
│       └── useAutoSave.ts
└── store/
    └── editorStore.ts
```

---

## Definition of Done ✅
- [x] Trang `/cv/new` chọn được template và màu, tạo CV thành công
- [x] Editor load CV từ `GET /cvs/:id`, hiển thị đúng data
- [x] Chỉnh sửa bất kỳ field → isDirty = true → auto-save sau 2s
- [x] Topbar hiển thị save status chính xác
- [x] CVPreview cập nhật real-time
- [x] Toggle visibility section hoạt động
- [x] AI gợi ý trong SummarySection và ExperienceSection (gated by subscription)
- [x] Tất cả endpoint đồng bộ với backend router
- [x] Section Blocks hiển thị đầy đủ khi tạo CV mới (blank template fix)
- [x] Trang `/cv/new` luôn có ít nhất 1 option “Trống” dù API lỗi hay trả rỗng
- [x] Template card và CVCard hiển thị thumbnail CV thật (scale-down `CVMiniPreview`)
- [x] Color picker dùng icon Pipette thay input nằm trống
