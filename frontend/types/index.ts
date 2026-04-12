// ─── User & Auth ───────────────────────────────────────────────────────────

export interface User {
  id: string
  email: string
  full_name: string
  avatar_url: string | null
  created_at: string
  updated_at: string
}

export interface Subscription {
  id: string
  user_id: string
  plan: 'free' | 'weekly' | 'monthly'
  status: 'active' | 'expired' | 'cancelled'
  started_at: string | null
  expires_at: string | null
  updated_at: string
}

export interface UserWithSubscription extends User {
  subscription: Subscription
}

export interface AuthTokens {
  access_token: string
  refresh_token: string
}

export interface LoginRequest {
  email: string
  password: string
}

export interface RegisterRequest {
  email: string
  password: string
  full_name: string
}

export interface AuthResponse {
  user: User
  subscription: Subscription
  access_token: string
  refresh_token: string
}

// ─── CV ────────────────────────────────────────────────────────────────────

export type SectionType =
  | 'personal'
  | 'summary'
  | 'experience'
  | 'education'
  | 'skills'
  | 'projects'
  | 'certifications'
  | 'languages'

export interface CVSection {
  id: string
  type: SectionType
  title: string
  visible: boolean
  order: number
  data: Record<string, unknown>
}

export interface CV {
  id: string
  user_id: string
  title: string
  template_id: string
  color_theme: string
  sections: CVSection[]
  created_at: string
  updated_at: string
}

export interface CVListItem {
  id: string
  title: string
  template_id: string
  color_theme: string
  updated_at: string
  created_at: string
}

export interface CreateCVRequest {
  title?: string
  template_id: string
  color_theme?: string
}

export interface UpdateCVRequest {
  title?: string
  template_id?: string
  color_theme?: string
  sections?: CVSection[]
}

// ─── Template ──────────────────────────────────────────────────────────────

export interface Template {
  id: string
  name: string
  thumbnail_url: string | null
  preview_url: string | null
  is_premium: boolean
  tags: string[]
}

// ─── Pagination ────────────────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
  total_pages: number
}

// ─── API response wrapper ──────────────────────────────────────────────────

export interface ApiResponse<T> {
  data: T
  message?: string
}

export interface ApiError {
  error: string
  message: string
  status_code: number
}
