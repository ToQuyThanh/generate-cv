# Release — Tuần 7: Bug Fix — Profile Snapshot không populate vào CV Editor

**Ngày:** Tháng 4/2026
**Loại:** 🐛 Bug Fix
**Trạng thái:** ✅ Hoàn thành

---

## Vấn đề

Sau khi user tạo CV từ một profile (chọn profile ở step 1 của `/cv/new`),
khi mở CV trong editor, **các trường thông tin từ profile không được hiển thị** —
editor hiển thị CV trống hoàn toàn dù profile đã có đầy đủ dữ liệu.

### Tái hiện lỗi

1. Tạo một Profile với đầy đủ thông tin (họ tên, email, kinh nghiệm…)
2. Vào `/cv/new` → Step 1: chọn profile vừa tạo
3. Step 2: chọn template → nhấn **Tạo CV**
4. CV mở trong editor → tất cả fields đều **trống**

---

## Root Cause

### Bug 1 — `editorStore.setCVData` không merge snapshot (Critical)

**File:** `store/editorStore.ts`

Backend trả về CV kèm `profile_snapshot` (toàn bộ data profile tại thời điểm tạo CV),
nhưng `setCVData` chỉ gán nguyên object CV vào store mà không có bước nào
chuyển đổi `profile_snapshot` thành `sections` cho editor render.

```
Backend response:
{
  id: "cv-xxx",
  sections: [],              ← rỗng
  profile_snapshot: {        ← có đầy đủ data
    full_name: "Nguyen Van A",
    email: "...",
    sections: [work_experience, education, skills...]
  }
}

editorStore trước fix:
setCVData(cv) → lưu cv.sections = []   ← editor render blank
```

### Bug 2 — `/cv/new` luôn gửi `getBlankSections()` dù có profile

**File:** `app/(dashboard)/cv/new/page.tsx`

```ts
// Trước fix: luôn gửi blank sections, override bất kỳ data nào backend muốn dùng
sections: getBlankSections(),
```

Khi backend nhận `sections` là array không rỗng (dù data bên trong rỗng),
nó lưu đúng array đó vào DB. Sau đó khi editor load, `sections` có 5 items
nhưng tất cả đều empty → editor render blank.

---

## Fix

### 1. Tạo `lib/profile-snapshot.ts` (file mới)

Utility module chứa logic chuyển đổi `profile_snapshot` → `CVSection[]`:

```
ProfileSnapshot (JSONB từ backend)
    ↓ snapshotToSections()
CVSection[] (format editor expect)
```

Bao gồm:
- `snapshotToSections(snapshot)` — map toàn bộ snapshot thành sections
- `hasProfileSnapshot(obj)` — type guard kiểm tra snapshot hợp lệ
- Mapping `personal info` → `personal` section
- Mapping `summary` → `summary` section  
- Mapping `work_experience` → `experience` section (với type rename)
- Mapping `education` → `education` section
- Mapping `skills` (group model) → flat skill items
- Mapping `projects`, `certifications`, custom sections
- Filter sections có `is_visible = false`

### 2. Fix `store/editorStore.ts`

`setCVData` giờ kiểm tra: nếu CV có `profile_snapshot` **và** sections đang rỗng/chưa
có data thực → tự động populate từ snapshot.

Logic kiểm tra "sections rỗng":
- `sections.length === 0`
- Hoặc tất cả sections đều empty data (personal không có `full_name`,
  summary không có `content`, các section khác không có `items`)

Điều kiện này đảm bảo: nếu user đã edit CV rồi thì **không override** data đang có.

### 3. Fix `app/(dashboard)/cv/new/page.tsx`

Không gửi `sections` khi có `profile_id`:

```ts
// Sau fix:
sections: selectedProfileId ? undefined : getBlankSections(),
```

Backend xử lý `sections = null/undefined` bằng `COALESCE($5, '[]'::jsonb)` —
lưu `[]` vào DB. Khi editor load CV, thấy `sections = []` + `profile_snapshot` có data
→ trigger populate từ snapshot.

---

## Files thay đổi

| File | Thay đổi |
|---|---|
| `lib/profile-snapshot.ts` | ✅ MỚI — `snapshotToSections`, `hasProfileSnapshot`, full mapping logic |
| `store/editorStore.ts` | ✅ FIX — `setCVData` thêm logic populate sections từ snapshot |
| `app/(dashboard)/cv/new/page.tsx` | ✅ FIX — không gửi `getBlankSections()` khi có `profile_id` |
| `__tests__/profile-snapshot.test.ts` | ✅ MỚI — 25 test cases |
| `__tests__/editorStore-snapshot.test.ts` | ✅ MỚI — 13 test cases |
| `__tests__/new-cv-page-profile.test.ts` | ✅ CẬP NHẬT — thêm 3 test cases sections logic |

---

## Tests mới

### Chạy

```bash
# Tất cả tests liên quan đến fix
npx vitest run __tests__/profile-snapshot.test.ts __tests__/editorStore-snapshot.test.ts __tests__/new-cv-page-profile.test.ts

# Toàn bộ test suite
npx vitest run
```

### Coverage

| File | Test cases | Covers |
|---|---|---|
| `profile-snapshot.test.ts` | 25 | `hasProfileSnapshot` (5), `snapshotToSections` structure (5), personal data (7), summary (2), work_experience (3), education (2), skills (2), visibility filter (2), ordering (1) |
| `editorStore-snapshot.test.ts` | 13 | CV không có snapshot (2), snapshot + empty sections (7), sections đã có data không bị override (1), snapshot null/invalid (2), reset (1) |
| `new-cv-page-profile.test.ts` | +3 | sections=undefined khi có profile_id (1), sections=blank khi không có profile_id (1), sections=[] default (1) |
| **Tổng mới** | **41** | |

---

## Behavior sau fix

| Tình huống | Trước | Sau |
|---|---|---|
| Tạo CV từ profile → mở editor | Tất cả fields trống | Fields populated từ profile |
| Tạo CV không có profile → mở editor | Blank sections (đúng) | Blank sections (không đổi) |
| Mở CV đã edit trước đó | Data hiện có (đúng) | Data hiện có (không bị override) |
| CV có profile_snapshot nhưng đã edit | Data editor (đúng) | Data editor (không bị override) |
| CV có `profile_snapshot = null` | Không crash (đúng) | Không crash (không đổi) |

---

## Checklist

- [x] Phân tích root cause (2 bugs)
- [x] `lib/profile-snapshot.ts` — utility module mapping snapshot → sections
- [x] `store/editorStore.ts` — fix `setCVData` populate logic
- [x] `app/(dashboard)/cv/new/page.tsx` — fix sections khi có profile_id
- [x] `__tests__/profile-snapshot.test.ts` — 25 test cases cho utility
- [x] `__tests__/editorStore-snapshot.test.ts` — 13 test cases cho store fix
- [x] `__tests__/new-cv-page-profile.test.ts` — update 3 test cases
- [x] Release note tuần 7
