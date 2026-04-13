# Production Plan — CV Data Management & Profile System

## 1. Tổng quan & Mental Model

Thay vì mỗi CV là một "tài liệu độc lập", hệ thống chuyển sang mô hình **Profile-first**:

```
User
 └── CV Profiles (nhiều bộ dữ liệu)
      ├── Profile "Senior Backend Engineer"
      ├── Profile "Freelance Fullstack"
      └── Profile "Tech Lead"
           └── CV Documents (nhiều CV tạo từ profile)
                ├── CV "Ứng tuyển MoMo" (template: modern)
                ├── CV "Ứng tuyển Grab" (template: minimal)
                └── CV "LinkedIn Export" (template: classic)
```

Người dùng **tạo Profile một lần** → **tạo nhiều CV** từ profile đó với template khác nhau, có thể override từng field trên CV mà không ảnh hưởng profile gốc.

---

## 2. Data Architecture

### 2.1 Core Entities

```
cv_profiles               — bộ dữ liệu gốc của user
cv_profile_sections       — các section trong profile (work, edu, skill...)
cv_profile_items          — từng item trong section
cv_documents              — CV thực tế được tạo từ profile
cv_document_overrides     — override data trên CV so với profile gốc
cv_uploads                — file upload (PDF/DOCX/XLSX) + parse status
```

### 2.2 Schema chi tiết

```sql
-- Bộ dữ liệu CV của user
CREATE TABLE cv_profiles (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,                    -- "Senior Backend", "Freelance"
  role_target   TEXT,                             -- "Software Engineer"
  summary       TEXT,
  -- Personal info
  full_name     TEXT,
  email         TEXT,
  phone         TEXT,
  location      TEXT,
  linkedin_url  TEXT,
  github_url    TEXT,
  website_url   TEXT,
  avatar_url    TEXT,
  -- Meta
  is_default    BOOLEAN DEFAULT false,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

-- Section trong profile (work_experience, education, skills, projects, certs...)
CREATE TABLE cv_profile_sections (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id  UUID NOT NULL REFERENCES cv_profiles(id) ON DELETE CASCADE,
  type        TEXT NOT NULL,    -- 'work_experience' | 'education' | 'skills' | 'projects' | 'certifications' | 'languages' | 'custom'
  title       TEXT NOT NULL,    -- display label, có thể đổi tên
  position    INT  NOT NULL,    -- thứ tự hiển thị
  is_visible  BOOLEAN DEFAULT true
);

-- Item trong section (1 công ty, 1 trường, 1 skill group...)
CREATE TABLE cv_profile_items (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id  UUID NOT NULL REFERENCES cv_profile_sections(id) ON DELETE CASCADE,
  position    INT  NOT NULL,
  is_visible  BOOLEAN DEFAULT true,
  data        JSONB NOT NULL    -- schema flexible theo type
);

-- CV Document tạo từ profile
CREATE TABLE cv_documents (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  profile_id       UUID REFERENCES cv_profiles(id) ON DELETE SET NULL,
  template_id      TEXT NOT NULL,
  title            TEXT NOT NULL,
  color_theme      TEXT,
  -- Snapshot tại thời điểm tạo (để không bị mất khi profile thay đổi)
  profile_snapshot JSONB,
  -- Override: user chỉnh sửa trực tiếp trên CV
  overrides        JSONB DEFAULT '{}',
  created_at       TIMESTAMPTZ DEFAULT now(),
  updated_at       TIMESTAMPTZ DEFAULT now()
);

-- Upload tracking
CREATE TABLE cv_uploads (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  profile_id    UUID REFERENCES cv_profiles(id) ON DELETE SET NULL,
  filename      TEXT NOT NULL,
  file_url      TEXT NOT NULL,
  file_type     TEXT NOT NULL,  -- 'pdf' | 'docx' | 'xlsx'
  parse_status  TEXT DEFAULT 'pending',  -- 'pending' | 'processing' | 'done' | 'failed'
  parsed_data   JSONB,          -- raw extract từ file
  error_message TEXT,
  created_at    TIMESTAMPTZ DEFAULT now()
);
```

### 2.3 JSONB Schema theo section type

```typescript
// work_experience item
{
  company:      string
  position:     string
  location?:    string
  start_date:   string          // "2022-03"
  end_date?:    string | null   // null = hiện tại
  is_current:   boolean
  description:  string          // markdown/plain
  achievements: string[]
  tech_stack?:  string[]
}

// education item
{
  school:       string
  degree:       string
  field:        string
  start_date:   string
  end_date?:    string
  gpa?:         string
  activities?:  string
}

// skills item (1 group)
{
  group_name:   string          // "Backend", "DevOps"
  skills:       string[]
  level?:       'beginner' | 'intermediate' | 'advanced' | 'expert'
}

// projects item
{
  name:         string
  role?:        string
  url?:         string
  start_date?:  string
  end_date?:    string
  description:  string
  tech_stack:   string[]
  highlights:   string[]
}

// certifications item
{
  name:         string
  issuer:       string
  date:         string
  url?:         string
  credential_id?: string
}
```

---

## 3. Backend API Design

### 3.1 Profiles CRUD

```
GET    /api/v1/profiles              — list tất cả profiles của user
POST   /api/v1/profiles              — tạo profile mới (blank hoặc từ upload)
GET    /api/v1/profiles/:id          — get profile đầy đủ
PUT    /api/v1/profiles/:id          — update profile meta
DELETE /api/v1/profiles/:id          — xóa profile + cascade sections/items
PATCH  /api/v1/profiles/:id/default  — set làm default profile
```

### 3.2 Sections & Items

```
GET    /api/v1/profiles/:id/sections
POST   /api/v1/profiles/:id/sections
PUT    /api/v1/profiles/:id/sections/:sectionId
DELETE /api/v1/profiles/:id/sections/:sectionId
PATCH  /api/v1/profiles/:id/sections/reorder     — { order: [id1, id2...] }

POST   /api/v1/sections/:sectionId/items
PUT    /api/v1/sections/:sectionId/items/:itemId
DELETE /api/v1/sections/:sectionId/items/:itemId
PATCH  /api/v1/sections/:sectionId/items/reorder
```

### 3.3 Upload & Parse

```
POST   /api/v1/uploads/parse         — upload file, trả về job_id
GET    /api/v1/uploads/:jobId/status — polling parse status + parsed_data
POST   /api/v1/uploads/:jobId/import — confirm import vào profile_id
```

### 3.4 CV Documents

```
POST   /api/v1/cv                    — tạo CV từ profile_id + template_id
                                       → snapshot profile tại thời điểm tạo
GET    /api/v1/cv/:id                — get CV + merged data (snapshot + overrides)
PUT    /api/v1/cv/:id/overrides      — save override data từ editor
POST   /api/v1/cv/:id/sync-profile   — refresh snapshot từ profile hiện tại
```

### 3.5 Parse Pipeline (background job)

```
Upload file
    ↓
Queue job (Redis/BullMQ)
    ↓
Worker: extract text
  ├── PDF  → pdf-parse / pdfplumber
  ├── DOCX → mammoth.js
  └── XLSX → SheetJS
    ↓
Send to AI (Claude / GPT) với structured prompt
    ↓
Validate & normalize JSON theo schema
    ↓
Store parsed_data + status = 'done'
    ↓
Frontend poll → hiển thị preview → user confirm import
```

---

## 4. Frontend Architecture

### 4.1 Routing Structure

```
app/
├── (dashboard)/
│   ├── dashboard/page.tsx        — list CV documents
│   ├── profiles/                 ← MỚI
│   │   ├── page.tsx              — list tất cả profiles
│   │   └── [id]/
│   │       ├── page.tsx          — edit profile (full page editor)
│   │       └── upload/page.tsx   — upload & import flow
│   ├── cv/
│   │   ├── new/page.tsx          — chọn profile + template → tạo CV  ← UPDATE
│   │   └── [id]/page.tsx         — CV editor (với override support)
```

### 4.2 State Management — Zustand stores

```typescript
// profileStore.ts — quản lý profiles list + active profile
interface ProfileStore {
  profiles:       CVProfile[]
  activeProfile:  CVProfile | null
  loading:        boolean

  fetchProfiles:  () => Promise<void>
  createProfile:  (data: CreateProfileDto) => Promise<CVProfile>
  updateProfile:  (id: string, data: Partial<CVProfile>) => Promise<void>
  deleteProfile:  (id: string) => Promise<void>
  setDefault:     (id: string) => Promise<void>
}

// profileEditorStore.ts — edit state cho profile editor page
interface ProfileEditorStore {
  profile:        CVProfile | null
  sections:       Section[]
  isDirty:        boolean
  isSaving:       boolean

  // Section ops
  addSection:     (type: SectionType) => void
  removeSection:  (id: string) => void
  reorderSections:(ids: string[]) => void

  // Item ops
  addItem:        (sectionId: string, data: ItemData) => void
  updateItem:     (sectionId: string, itemId: string, data: Partial<ItemData>) => void
  removeItem:     (sectionId: string, itemId: string) => void
  reorderItems:   (sectionId: string, ids: string[]) => void

  // Persist
  save:           () => Promise<void>
}

// uploadStore.ts — upload flow state
interface UploadStore {
  jobId:          string | null
  status:         'idle' | 'uploading' | 'processing' | 'review' | 'done' | 'error'
  parsedData:     ParsedCVData | null
  progress:       number

  upload:         (file: File) => Promise<void>
  pollStatus:     () => void
  confirmImport:  (profileId: string) => Promise<void>
  reset:          () => void
}
```

### 4.3 Component Tree — Profiles Page

```
ProfilesPage
├── ProfilesHeader
│   ├── <title> + <wf-label>
│   ├── UploadButton → opens UploadModal
│   └── CreateProfileButton
│
├── ProfileGrid
│   └── ProfileCard (×N)
│       ├── ProfileCardThumbnail (avatar + role + completion %)
│       ├── ProfileCardMeta (name, section count, last updated)
│       └── ProfileCardActions (Edit | Create CV | Duplicate | Delete)
│
└── EmptyState (nếu chưa có profile)
```

### 4.4 Component Tree — Profile Editor Page

```
ProfileEditorPage
├── EditorTopbar
│   ├── BackButton
│   ├── ProfileNameInput (inline edit)
│   ├── SaveStatus indicator ("Saved" / "Saving..." / "Unsaved changes")
│   └── Actions: [Create CV from this profile] [Delete Profile]
│
├── EditorLayout (split: left panel + right preview)
│   │
│   ├── LEFT: ProfileEditorPanel
│   │   ├── PersonalInfoSection (always visible, non-collapsible)
│   │   │   ├── Avatar upload
│   │   │   ├── Name, Email, Phone, Location
│   │   │   └── LinkedIn, GitHub, Website
│   │   │
│   │   ├── SectionList (drag-to-reorder via @dnd-kit)
│   │   │   └── SectionBlock (×N)
│   │   │       ├── SectionHeader (title | visible toggle | drag handle | delete)
│   │   │       ├── ItemList (drag-to-reorder)
│   │   │       │   └── ItemCard (×N) — collapsed summary + expand to edit
│   │   │       └── AddItemButton
│   │   │
│   │   └── AddSectionButton → SectionTypePicker modal
│   │
│   └── RIGHT: ProfilePreview (live preview với default template)
│       └── mini CV render từ profile data
```

### 4.5 Component Tree — Upload Flow

```
UploadModal (multi-step)
├── Step 1: FileDropzone
│   ├── Drag & drop zone
│   ├── Supported formats: PDF, DOCX, XLSX
│   └── File size limit: 10MB
│
├── Step 2: Processing
│   ├── AnimatedSpinner + progress text
│   └── Polling /uploads/:jobId/status
│
├── Step 3: Review & Edit parsed data
│   ├── ParsedDataReview
│   │   ├── PersonalInfo preview (editable)
│   │   ├── SectionList preview (toggle include/exclude mỗi section)
│   │   └── ItemList preview (toggle include/exclude mỗi item)
│   ├── ProfileSelector: "Import vào profile nào?"
│   │   ├── Existing profile (merge hoặc overwrite)
│   │   └── Tạo profile mới từ file này
│   └── ConfirmImportButton
│
└── Step 4: Success → redirect to Profile Editor
```

### 4.6 CV Creation Flow (updated)

```
/cv/new (updated)
├── Step 1: Chọn Profile
│   ├── ProfileSelector grid (chọn bộ dữ liệu)
│   └── Link "Tạo profile mới"
│
├── Step 2: Chọn Template
│   └── TemplateGrid (như hiện tại)
│
└── Step 3: Review & Confirm
    ├── Profile summary
    ├── Template preview
    └── "Tạo CV" button → POST /api/v1/cv
                        → snapshot profile
                        → redirect /cv/:id (editor)
```

---

## 5. Profile Editor — Override Model

Khi user mở CV editor từ một CV document, họ chỉnh sửa **overrides**, không phải profile gốc:

```typescript
// CV Document data = merge(profile_snapshot, overrides)
function getMergedCVData(document: CVDocument): CVData {
  return deepMerge(document.profile_snapshot, document.overrides)
}

// Khi user sửa field trong editor:
function updateCVField(path: string, value: unknown) {
  // Chỉ lưu vào overrides, không đụng profile_snapshot
  editorStore.setOverride(path, value)
  // Debounce auto-save
  debouncedSave()
}

// "Sync from profile" button:
function syncFromProfile() {
  // Refresh profile_snapshot từ profile hiện tại
  // Overrides vẫn được giữ nguyên (chỉ overrides bị conflict mới hỏi user)
  api.syncProfileSnapshot(documentId)
}
```

---

## 6. Sidebar Update

```typescript
const navItems = [
  { href: '/dashboard', label: 'Dashboard',    icon: LayoutDashboard },
  { href: '/profiles',  label: 'Dữ liệu CV',   icon: Database },   // ← MỚI
  { href: '/cv/new',    label: 'Tạo CV mới',   icon: PlusCircle },
]
```

Badge hiển thị số profiles trên nav item:

```tsx
<Link href="/profiles" ...>
  <Database className="h-4 w-4" />
  Dữ liệu CV
  {profileCount > 0 && (
    <span className="ml-auto wf-badge">{profileCount}</span>
  )}
</Link>
```

---

## 7. Implementation Phases

### Phase 1 — Foundation (Backend + DB)
- [ ] Migration: tạo 5 tables mới
- [ ] CRUD API cho profiles, sections, items
- [ ] Unit tests cho API endpoints
- [ ] Update `POST /cv` nhận thêm `profile_id`, tạo snapshot

### Phase 2 — Frontend Core
- [ ] `profileStore.ts` + `profileEditorStore.ts`
- [ ] `/profiles` page — list + ProfileCard
- [ ] `/profiles/[id]` — ProfileEditorPage với PersonalInfo + sections
- [ ] Sidebar: thêm tab "Dữ liệu CV" với badge
- [ ] Update `/cv/new` — step "chọn profile" trước template

### Phase 3 — Upload Pipeline
- [ ] Backend: upload endpoint + BullMQ job
- [ ] Parse worker: PDF (pdf-parse), DOCX (mammoth), XLSX (SheetJS)
- [ ] AI extraction prompt + schema validation
- [ ] Frontend: UploadModal 4-step flow
- [ ] Polling hook `useUploadStatus`

### Phase 4 — Override & Sync
- [ ] Override model trong CV editor
- [ ] "Sync from profile" feature
- [ ] Conflict resolution UI (khi profile thay đổi sau khi CV đã tạo)
- [ ] Profile completion % indicator

### Phase 5 — Polish & Production
- [ ] Drag-to-reorder sections/items (`@dnd-kit`)
- [ ] Bulk operations: delete multiple items
- [ ] Export profile to JSON (backup)
- [ ] Import profile từ JSON
- [ ] Rate limiting cho upload endpoint
- [ ] File virus scan (ClamAV hoặc cloud service)
- [ ] Profile duplication

---

## 8. Key Technical Decisions

| Quyết định | Lựa chọn | Lý do |
|---|---|---|
| Parse queue | BullMQ + Redis | Reliable, retry, progress tracking |
| File storage | S3 / R2 | Scalable, CDN-ready |
| Parse PDF | pdfplumber (Python) hoặc pdf-parse (Node) | pdfplumber tốt hơn cho layout |
| AI extraction | Claude API với structured output | Flexible schema, tiếng Việt tốt |
| Drag-to-reorder | @dnd-kit | Accessible, lightweight |
| Override merge | deep-merge với path-based tracking | Granular, không mất data |
| Profile snapshot | JSONB trong cv_documents | Tránh breaking change khi profile update |

---

## 9. Edge Cases cần xử lý

- **Profile bị xóa** sau khi CV đã tạo → CV vẫn hoạt động từ snapshot
- **Parse thất bại** → user có thể nhập thủ công hoặc retry
- **File lớn / timeout** → job timeout 5 phút, notify email nếu fail
- **Merge conflict** khi sync profile vào CV có nhiều overrides → show diff UI
- **Free user limit** → giới hạn 1 profile, premium không giới hạn
- **Concurrent edit** → last-write-wins + updated_at check
