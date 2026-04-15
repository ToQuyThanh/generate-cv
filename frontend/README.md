# GenerateCV — Frontend

Next.js 14 App Router · TypeScript · Tailwind CSS · Zustand · shadcn/ui

## Tech stack (Stable LTS)

| Package | Version |
|---|---|
| Next.js | 14.2.29 |
| React | 18.3.1 |
| TypeScript | 5.7.3 |
| Tailwind CSS | 3.4.17 |
| Zustand | 4.5.5 |
| Axios | 1.7.9 |
| Zod | 3.24.1 |
| React Hook Form | 7.54.2 |
| Vitest | 2.1.8 |

## Cấu trúc thư mục

```
frontend/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx       # Trang đăng nhập
│   │   └── register/page.tsx    # Trang đăng ký
│   ├── (dashboard)/
│   │   ├── layout.tsx           # Layout với Sidebar + auth guard
│   │   ├── dashboard/page.tsx   # Danh sách CV
│   │   ├── cv/[id]/page.tsx     # Editor CV (Tuần 7–8)
│   │   └── settings/page.tsx    # Cài đặt tài khoản (Tuần 9–10)
│   ├── pricing/page.tsx         # Trang pricing (Tuần 9–10)
│   ├── layout.tsx               # Root layout
│   ├── globals.css
│   └── page.tsx                 # Redirect → /dashboard
├── components/
│   ├── ui/                      # shadcn/ui base components
│   ├── cv/                      # CV-specific components
│   ├── editor/                  # Editor components (Tuần 7–8)
│   ├── payment/                 # Payment components (Tuần 9–10)
│   └── shared/                  # Sidebar, Header, ...
├── lib/
│   ├── api/                     # Axios client + API modules
│   └── utils/                   # Helper functions
├── store/
│   ├── authStore.ts             # Zustand auth store
│   └── index.ts
├── types/
│   └── index.ts                 # TypeScript types toàn bộ app
└── __tests__/                   # Vitest test files
```

## Chạy local

```bash
# 1. Cài dependencies
npm install

# 2. Copy env
cp .env.local.example .env.local
# Điền NEXT_PUBLIC_API_URL=http://localhost:8080

# 3. Chạy dev server
npm run dev
# → http://localhost:3000
```

## Chạy tests

```bash
# Chạy toàn bộ test
npm test

# Chạy với UI
npm run test:ui

# Chạy với coverage
npx vitest run --coverage
```

## Scripts

```bash
npm run dev          # Dev server
npm run build        # Production build
npm run start        # Production server
npm run lint         # ESLint
npm run type-check   # TypeScript check
npm test             # Vitest
```

## Luồng Auth

```
User nhập form
  → React Hook Form validate (Zod)
  → authApi.login() / authApi.register()
  → setAuth() → Zustand store + localStorage (token)
  → redirect /dashboard

Request bất kỳ
  → Axios interceptor đính kèm Bearer token
  → 401 → tự gọi POST /auth/refresh
  → Nếu refresh thất bại → clearAuth + redirect /login
```

## Conventions

- Tất cả component dùng `'use client'` nếu có state/effect
- API calls chỉ trong page hoặc custom hooks, không trong components nhỏ
- Zustand store: 1 store = 1 domain (auth, editor, ...)
- Toast: dùng `sonner`, không dùng alert/confirm
- Xóa nguy hiểm: luôn yêu cầu confirm lần 2 (pattern double-click)

## Phát triển tiếp (Tuần 7–8)

- [ ] `app/(dashboard)/cv/[id]/page.tsx` — Editor layout 2 cột
- [ ] `store/editorStore.ts` — cvData, isDirty, isSaving
- [ ] `components/editor/SectionBlock.tsx` — Personal, Summary, Experience...
- [ ] Auto-save debounce 2 giây
- [ ] CV Preview real-time
