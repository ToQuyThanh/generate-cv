# Release — Tuần 7 (bổ sung): Section Editor đầy đủ — Projects, Certifications, Languages & Extended Fields

**Ngày:** Tháng 4/2026
**Loại:** ✨ Feature — Section Coverage hoàn chỉnh
**Trạng thái:** ✅ Hoàn thành

---

## Vấn đề

Sau khi fix bug populate snapshot (tuần 7 phần 1), thông tin từ profile đã được
đưa vào `sections` của CV. Tuy nhiên editor **không thể hiển thị hay chỉnh sửa**
các sections `projects`, `certifications`, `languages` vì:

1. `EditorPanel.SECTION_MAP` chỉ có 5 entries — `projects`, `certifications`, `languages`
   không có component, khi render bị **bỏ qua hoàn toàn** (silent skip).
2. `ExperienceItem` thiếu `location`, `achievements`, `tech_stack` — dữ liệu từ profile
   bị drop khi populate (không có field để chứa).
3. `EducationItem` có `description` nhưng profile lưu trường tương đương là `activities`
   → mapping sai, field luôn rỗng sau khi populate.
4. `profile-snapshot.ts` thiếu mapping cho `certifications.credential_id`,
   `languages.level`, `projects.highlights`.

---

## Thay đổi

### 1. `types/index.ts` — Mở rộng type system

**`ExperienceItem`** — thêm fields từ `WorkExperienceItemData`:
```ts
location?:     string      // địa điểm làm việc
achievements?: string[]    // thành tích nổi bật
tech_stack?:   string[]    // công nghệ sử dụng
```

**Types mới** cho 3 section chưa có:
```ts
ProjectItem / ProjectsData
CertificationItem / CertificationsData
LanguageLevel / LanguageItem / LanguagesData
```

`LanguageLevel` enum: `basic | conversational | professional | fluent | native`

---

### 2. `components/editor/sections/ExperienceSection.tsx` — Thêm fields

Fields mới trong form:
- **Địa điểm** (`location`) — text input, optional
- **Thành tích nổi bật** (`achievements`) — tag input, Enter/blur để thêm, badge xanh lá
- **Công nghệ sử dụng** (`tech_stack`) — tag input, Enter/dấu phẩy/blur, badge xanh dương

Tag UX: hiển thị badges inline, nút `×` để xóa từng tag.

---

### 3. `components/editor/sections/EducationSection.tsx` — Thêm Description

Thêm textarea **"Hoạt động / ghi chú"** (`description`) — map với `activities` từ profile.

---

### 4. `components/editor/sections/ProjectsSection.tsx` *(MỚI)*

Fields:
- Tên dự án (`name`) + Vai trò (`role`)
- Link dự án (`url`)
- Từ tháng / Đến tháng
- Mô tả dự án (`description`)
- Điểm nổi bật (`highlights`) — tag input
- Công nghệ (`tech_stack`) — tag input

---

### 5. `components/editor/sections/CertificationsSection.tsx` *(MỚI)*

Fields:
- Tên chứng chỉ (`name`)
- Tổ chức cấp (`issuer`) + Ngày cấp (`date`)
- Link xác minh (`url`)
- Mã chứng chỉ (`credential_id`)

---

### 6. `components/editor/sections/LanguagesSection.tsx` *(MỚI)*

UX: mỗi dòng là 1 ngôn ngữ — input tên + 5 nút level (Cơ bản → Bản ngữ).
Level buttons dùng màu riêng biệt để phân biệt trực quan:

| Level | Label | Màu |
|---|---|---|
| basic | Cơ bản | Gray |
| conversational | Giao tiếp | Blue |
| professional | Chuyên nghiệp | Indigo |
| fluent | Thành thạo | Green |
| native | Bản ngữ | Amber |

---

### 7. `components/editor/EditorPanel.tsx` — Đăng ký 3 section mới

```ts
const SECTION_MAP = {
  personal, summary, experience, education, skills,
  projects,       // ← MỚI
  certifications, // ← MỚI
  languages,      // ← MỚI
}
```

---

### 8. `lib/profile-snapshot.ts` — Mapping đầy đủ

| Section | Field bổ sung |
|---|---|
| `work_experience` | `achievements[]`, `tech_stack[]` |
| `education` | fallback `activities → description` (cả hai field) |
| `projects` | `highlights[]`, `tech_stack[]` |
| `certifications` | `credential_id` |
| `languages` | `level` (với default `'professional'`), fallback `name → language` |

---

## Files thay đổi

| File | Thay đổi |
|---|---|
| `types/index.ts` | ✅ CẬP NHẬT — `ExperienceItem` + 3 group types mới + `LanguageLevel` |
| `components/editor/sections/ExperienceSection.tsx` | ✅ CẬP NHẬT — location, achievements, tech_stack |
| `components/editor/sections/EducationSection.tsx` | ✅ CẬP NHẬT — description textarea |
| `components/editor/sections/ProjectsSection.tsx` | ✅ MỚI — full projects editor |
| `components/editor/sections/CertificationsSection.tsx` | ✅ MỚI — full certifications editor |
| `components/editor/sections/LanguagesSection.tsx` | ✅ MỚI — language + level selector |
| `components/editor/EditorPanel.tsx` | ✅ CẬP NHẬT — đăng ký 3 section mới |
| `lib/profile-snapshot.ts` | ✅ CẬP NHẬT — mapping đầy đủ tất cả fields |
| `__tests__/profile-snapshot.test.ts` | ✅ CẬP NHẬT — 45 test cases (thêm projects, certs, langs, extended fields) |
| `__tests__/new-sections.test.ts` | ✅ MỚI — 32 test cases |

---

## Tests

### Chạy

```bash
# Tests mới
npx vitest run __tests__/profile-snapshot.test.ts __tests__/new-sections.test.ts

# Toàn bộ
npx vitest run
```

### Coverage

| File | Test cases |
|---|---|
| `profile-snapshot.test.ts` | 45 (full rewrite — thêm projects 5, certifications 2, languages 3, extended fields 3) |
| `new-sections.test.ts` | 32 (ProjectsSection 14, CertificationsSection 5, LanguagesSection 6, ExperienceItem ext 7) |
| **Tổng mới** | **77** |

---

## Behavior sau thay đổi

| Scenario | Trước | Sau |
|---|---|---|
| CV có profile với work_experience đầy đủ (achievements, tech_stack) | achievements và tech_stack bị drop | Hiển thị đầy đủ, có thể chỉnh sửa |
| CV có profile với education (activities) | description rỗng | activities được map vào description |
| CV có profile với projects | Section không hiển thị trong editor | ProjectsSection với full form |
| CV có profile với certifications | Section không hiển thị trong editor | CertificationsSection với credential_id |
| CV có profile với languages | Section không hiển thị trong editor | LanguagesSection với level selector |
| Thêm section projects/certs/langs thủ công | Không thể (không có component) | Hoạt động bình thường |

---

## Checklist

- [x] `types/index.ts` — `ExperienceItem` + `ProjectItem/Data`, `CertificationItem/Data`, `LanguageLevel`, `LanguageItem/Data`
- [x] `ExperienceSection` — location, achievements (tag), tech_stack (tag)
- [x] `EducationSection` — description/activities textarea
- [x] `ProjectsSection` — full form: name, role, url, dates, description, highlights, tech_stack
- [x] `CertificationsSection` — full form: name, issuer, date, url, credential_id
- [x] `LanguagesSection` — language input + 5-level visual selector
- [x] `EditorPanel` — register projects, certifications, languages
- [x] `profile-snapshot.ts` — mapping đầy đủ mọi field cho tất cả section types
- [x] `__tests__/profile-snapshot.test.ts` — rewrite với 45 test cases
- [x] `__tests__/new-sections.test.ts` — 32 test cases mới
- [x] Release note
