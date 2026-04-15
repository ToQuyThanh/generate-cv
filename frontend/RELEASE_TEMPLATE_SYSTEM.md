# Release — Phase 3.5: Template System

**Ngày:** Tháng 4/2026
**Phạm vi:** Frontend — Template-as-Code Infrastructure + UI quản lý template

---

## Tóm tắt

Phase 3.5 hoàn thiện kiến trúc **Template-as-Code**: mỗi template CV là một React component độc lập, DB chỉ lưu metadata. Trước đây tất cả template đều render cùng một layout hardcode (Modern). Sau release này, mọi template hiển thị đúng layout riêng của mình — cả ở thumbnail, editor preview, và trang chọn template.

---

## Thay đổi

### Mới hoàn toàn

#### `frontend/templates/registry.ts`
- **Registry trung tâm** — map `template_id → { component, meta }`
- `resolveTemplate(id)` — fallback về Modern nếu id không tồn tại
- `getAllTemplates()` — list tất cả template, free trước / premium sau
- `getDefaultColor(id)` — lấy màu mặc định của từng template

#### `frontend/templates/sidebar/`
- **Template Sidebar** (premium) — layout 2 cột: sidebar trái màu đậm (35%) + main phải (65%)
- Avatar initials, contact list, skill progress bar trong sidebar
- Badge ngày làm việc dạng pill màu accent trong main column
- `meta.ts`: `id: template_sidebar_01`, `isPremium: true`, `defaultColor: #4f46e5`

#### `frontend/app/(dashboard)/templates/page.tsx`
- **Trang quản lý template** tại `/templates`
- Grid hiển thị tất cả template với thumbnail render thật (không dùng ảnh tĩnh)
- Bộ lọc: Tất cả / Miễn phí / Premium
- Color picker để xem trước thumbnail với màu tùy chọn
- Click vào thumbnail → modal chi tiết: feature list, default color, tags
- Nút "Dùng template này" → redirect sang `/cv/new?template={id}`
- Lock overlay cho template premium với free user

### Cập nhật

#### `frontend/components/cv/CVMiniPreview.tsx`
- Nhận thêm prop `templateId?: string`
- Resolve đúng template component từ registry thay vì layout hardcode
- Giữ nguyên scale-down logic (CSS transform) để thumbnail đúng tỷ lệ A4
- **Breaking change**: component không còn hardcode layout Modern — cần truyền `templateId`

#### `frontend/components/editor/CVPreview.tsx`
- Dùng `resolveTemplate(cvData.template_id)` từ registry
- Render trực tiếp template component ở 595px — không scale, không qua `CVMiniPreview`
- Hỗ trợ switch template real-time khi user đổi trong editor

#### `frontend/app/(dashboard)/cv/new/page.tsx`
- Thumbnail từng template card render đúng layout (không còn dùng hardcode Modern)
- Tích hợp registry local — không cần đợi API để hiển thị danh sách template
- Khi chọn template → `selectedColor` tự động set về `defaultColor` của template đó
- Fallback về local registry khi API lỗi (offline-capable)
- `BlankThumbnail` riêng cho template "Trống"

#### `frontend/components/shared/Sidebar.tsx`
- Thêm nav item **"Templates"** với icon `LayoutTemplate` (lucide-react)
- Active state dùng `startsWith` để match cả sub-routes của `/templates`

### Tests mới

#### `__tests__/registry.test.ts` (26 test cases)
- Kiểm tra số lượng template đăng ký
- `resolveTemplate` trả đúng entry và fallback khi id lỗi
- `getAllTemplates` sort đúng thứ tự free → premium
- `getDefaultColor` trả đúng màu và fallback
- Meta integrity: không trùng ID, key khớp với meta.id, tags hợp lệ

#### `__tests__/templates.test.tsx` (shared + specific tests)
- **Shared tests × 4 templates**: render tên, job title, summary, công ty, trường học, kỹ năng
- Không render section `visible: false`
- Không crash khi sections rỗng
- **SidebarTemplate specific**: hiển thị initials đúng, fallback "CV" khi không có tên
- **ClassicTemplate specific**: dot level indicator render đủ số lượng
- **MinimalTemplate specific**: progress bar kỹ năng có mặt trong DOM

#### `__tests__/CVPreview.test.tsx` (cập nhật)
- Thêm test: render đúng với template Classic khi `template_id` thay đổi
- Thêm test: render đúng với template Sidebar (initials "VA")
- Thêm test: fallback về Modern khi `template_id` không hợp lệ

---

## Cách thêm template mới

```
1. Tạo  frontend/templates/{tên}/meta.ts      ← điền id, isPremium, tags, defaultColor
2. Tạo  frontend/templates/{tên}/index.tsx    ← viết layout React (nhận TemplateProps)
3. Đăng ký vào  frontend/templates/registry.ts
4. Chạy  npm run seed:templates               ← sync metadata lên DB
5. Done — thumbnail tự sinh, không cần ảnh tĩnh
```

---

## Template hiện có

| ID | Tên | Loại | Màu mặc định | Layout |
|---|---|---|---|---|
| `template_modern_01` | Modern | Free | `#1a56db` | Single-column, header màu |
| `template_classic_01` | Classic | Free | `#1e3a5f` | Single-column, tên căn giữa, serif |
| `template_minimal_01` | Minimal | Free | `#059669` | Two-column (70/30), sidebar phải |
| `template_sidebar_01` | Sidebar | Premium | `#4f46e5` | Two-column (35/65), sidebar trái màu |

---

## Không thay đổi

- Backend API (`/templates`, `/cvs`)
- `editorStore`, `authStore`
- Các trang: `/dashboard`, `/cv/[id]`, `/settings`, `/pricing`
- `lib/api/`, `lib/cv-template.ts`, `types/index.ts`
- `EditorPanel`, `EditorLayout`, `AIAssistPanel`, `ExportButton`

---

## Checklist trước deploy

- [x] `registry.ts` — 4 template đăng ký, meta.id khớp key
- [x] `SidebarTemplate` — render đúng 2 cột, không crash khi data rỗng
- [x] `CVMiniPreview` nhận `templateId`, backward compatible (default về Modern)
- [x] `CVPreview` dùng registry, không còn phụ thuộc hardcode
- [x] `/templates` page — filter, color picker, detail modal hoạt động
- [x] Sidebar nav có "Templates"
- [x] Tests: 26 registry tests + 32 template render tests + 9 CVPreview tests
- [ ] `npm run type-check` — không có lỗi TypeScript
- [ ] `npm test` — tất cả tests pass
- [ ] Test thủ công: chọn template Sidebar trong `/cv/new`, vào editor, thấy layout đúng
