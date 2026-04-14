# Release — Tuần 8: Fix Thumbnail — Template & CV Card Preview

**Ngày:** Tháng 4/2026
**Loại:** 🐛 Bug Fix + ✨ UI Improvement
**Trạng thái:** ✅ Hoàn thành

---

## Vấn đề

### Bug 1 — Template thumbnail hiển thị trắng hoàn toàn

**Trang:** `/cv/new` (bước chọn template)

`CVMiniPreview` trong template card được truyền `PREVIEW_SECTIONS = getBlankSections()` — toàn bộ sections đều rỗng:
- `personal.full_name = ''` → header hiển thị placeholder "Họ và tên"
- `experience.items = []`, `education.items = []`, `skills.items = []` → không render body sections nào
- Kết quả: chỉ thấy header màu, phần còn lại trắng trống — **không nhìn được layout thật của template**

### Bug 2 — CV Card thumbnail dùng sai template

**Trang:** `/dashboard`

`CVCard` truyền `CVMiniPreview` không có `templateId` → component dùng fallback mặc định là `template_modern_01` cho tất cả CV, **bất kể CV đó đang dùng template nào**. CV dùng template `classic`, `sidebar`, `executive`... đều render ra layout `modern`.

---

## Root Cause

| Bug | File | Nguyên nhân |
|-----|------|-------------|
| Bug 1 | `app/(dashboard)/cv/new/page.tsx` | `PREVIEW_SECTIONS = getBlankSections()` → data rỗng |
| Bug 2 | `components/cv/CVCard.tsx` | Không truyền `templateId={cv.template_id}` vào `CVMiniPreview` |

---

## Giải pháp

### Fix 1 — Tạo `getSampleSections()` với fake data đầy đủ

**File:** `lib/cv-template.ts`

Thêm hàm `getSampleSections()` trả về 8 sections với dữ liệu fake thực tế:
- **Personal:** "Nguyễn Minh Khoa", "Senior Frontend Developer", email, phone, location, linkedin, github
- **Summary:** Đoạn giới thiệu đầy đủ (~2 câu)
- **Experience:** 3 vị trí tại các công ty thực tế (TechCorp Vietnam, StartupXYZ, Digital Agency ABC)
- **Education:** ĐHBK Hà Nội, GPA 3.6
- **Skills:** 8 kỹ năng phổ biến (React, TypeScript, Node.js, Tailwind, ...)
- **Projects:** 1 dự án với tech stack
- **Certifications:** 2 chứng chỉ (AWS, Google)
- **Languages:** 3 ngôn ngữ (Việt, Anh, Nhật)

Fake data đa dạng giúp tất cả sections của mọi template đều có nội dung để render.

### Fix 2 — Dùng `getSampleSections()` cho template preview

**File:** `app/(dashboard)/cv/new/page.tsx`

```diff
- import { getBlankSections } from '@/lib/cv-template'
+ import { getBlankSections, getSampleSections } from '@/lib/cv-template'

- const PREVIEW_SECTIONS = getBlankSections()
+ const PREVIEW_SECTIONS = getSampleSections()
```

### Fix 3 — Truyền `templateId` vào `CVMiniPreview` trong `CVCard`

**File:** `components/cv/CVCard.tsx`

```diff
  <CVMiniPreview
    sections={cv.sections ?? []}
    colorTheme={cv.color_theme}
+   templateId={cv.template_id}
    containerWidth={280}
  />
```

---

## Kết quả

| Trước | Sau |
|-------|-----|
| Template card: chỉ hiện header màu, body trắng | Template card: hiện CV đầy đủ với fake data (tên, kinh nghiệm, kỹ năng, ...) |
| CV Card: luôn render layout `modern` | CV Card: render đúng template của từng CV |

---

## Files thay đổi

| File | Loại thay đổi |
|------|--------------|
| `lib/cv-template.ts` | ✨ Thêm `getSampleSections()` |
| `app/(dashboard)/cv/new/page.tsx` | 🐛 Dùng `getSampleSections()` thay `getBlankSections()` cho preview |
| `components/cv/CVCard.tsx` | 🐛 Thêm `templateId={cv.template_id}` vào `CVMiniPreview` |

---

## Không ảnh hưởng

- Logic tạo CV thật (`handleCreate`) vẫn dùng `getBlankSections()` — **không thay đổi**
- `CVMiniPreview` không bị sửa — chỉ thay đổi props truyền vào
- Templates không bị sửa — chúng đã render an toàn khi sections đầy đủ
- Không ảnh hưởng đến editor, export, API
