// ─── User & Auth ───────────────────────────────────────────────────────────

export interface User {
  id: string
  email: string
  full_name: string
  avatar_url: string | null
  created_at: string
  updated_at?: string
}

export interface Subscription {
  id: string
  user_id?: string
  plan: 'free' | 'weekly' | 'monthly'
  status: 'active' | 'expired' | 'cancelled'
  started_at: string | null
  expires_at: string | null
  updated_at: string
}

export interface UserWithSubscription extends User {
  subscription: Subscription | null
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

// Backend model.AuthResponse: { access_token, refresh_token, user: UserResponse }
// UserResponse KHÔNG có subscription — subscription chỉ có ở /users/me
export interface AuthResponse {
  access_token: string
  refresh_token: string
  user: User
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

export interface PersonalData {
  full_name: string
  job_title: string
  email: string
  phone: string
  location: string
  website: string
  linkedin: string
  github: string
  avatar_url: string
}

export interface SummaryData {
  content: string
}

export interface ExperienceItem {
  id: string
  company: string
  position: string
  start_date: string
  end_date: string
  is_current: boolean
  description: string
}

export interface ExperienceData {
  items: ExperienceItem[]
}

export interface EducationItem {
  id: string
  school: string
  degree: string
  field: string
  start_date: string
  end_date: string
  gpa?: string
  description?: string
}

export interface EducationData {
  items: EducationItem[]
}

export interface SkillItem {
  id: string
  name: string
  level: 1 | 2 | 3 | 4 | 5
}

export interface SkillsData {
  items: SkillItem[]
}

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
  sections: CVSection[]
  updated_at: string
  created_at: string
}

// Backend binding:"required" cho title, template_id, color_theme
export interface CreateCVRequest {
  title: string
  template_id: string
  color_theme: string
  sections?: CVSection[]
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
// Backend trả: data, total, page, per_page, total_pages

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  per_page: number          // backend dùng per_page (không phải limit)
  total_pages: number
}

// ─── API response wrapper ──────────────────────────────────────────────────

export interface ApiResponse<T> {
  data: T
  message?: string
}

export interface ApiError {
  error: string
  message?: string
  status_code?: number
}

// ─── AI ────────────────────────────────────────────────────────────────────

export interface AISuggestSummaryRequest {
  cv_id: string
  job_title?: string
  years_experience?: number
}

export interface AISuggestExperienceRequest {
  cv_id: string
  company: string
  position: string
  current_description?: string
}

export interface AIAnalyzeJDRequest {
  cv_id: string
  job_description: string
}

export interface AIAnalyzeJDResponse {
  keywords: string[]
  missing_keywords: string[]
  match_score: number
  suggestions: string[]
}

export interface AIRewriteSectionRequest {
  cv_id: string
  section_id: string
  content: string
  tone: 'professional' | 'concise' | 'impactful'
}

export interface AISuggestionResponse {
  suggestion: string
}

// ─── Export ────────────────────────────────────────────────────────────────

export interface ExportJobResponse {
  job_id: string
}

export interface ExportStatusResponse {
  status: 'pending' | 'processing' | 'done' | 'failed'
  url?: string
  error?: string
}

// ─── Payment ───────────────────────────────────────────────────────────────

export type PaymentMethod = 'vnpay' | 'momo'
export type PaymentPlan = 'weekly' | 'monthly'

export interface CreatePaymentRequest {
  plan: PaymentPlan
  method: PaymentMethod
}

export interface CreatePaymentResponse {
  payment_url: string
  transaction_id: string
}

export interface PaymentTransaction {
  id: string
  plan: PaymentPlan
  method: PaymentMethod
  amount_vnd: number
  status: 'pending' | 'success' | 'failed' | 'refunded'
  provider_ref: string | null
  created_at: string
  paid_at: string | null
}

// Backend trả { data, meta: { total, page, page_size } }
export interface PaymentHistoryMeta {
  total: number
  page: number
  page_size: number
}

export interface PaymentHistoryResponse {
  data: PaymentTransaction[]
  meta: PaymentHistoryMeta
}
