import apiClient from './client'
import type { AuthResponse, LoginRequest, RegisterRequest } from '@/types'
import { REFRESH_TOKEN_KEY } from './client'

export const authApi = {
  login: (body: LoginRequest) =>
    apiClient.post<AuthResponse>('/auth/login', body).then((r) => r.data),

  register: (body: RegisterRequest) =>
    apiClient.post<AuthResponse>('/auth/register', body).then((r) => r.data),

  // Backend POST /auth/logout — body: { refresh_token: string }
  logout: () => {
    const refreshToken =
      typeof window !== 'undefined'
        ? localStorage.getItem(REFRESH_TOKEN_KEY)
        : null
    return apiClient.post('/auth/logout', { refresh_token: refreshToken ?? '' })
  },

  forgotPassword: (email: string) =>
    apiClient.post('/auth/forgot-password', { email }),

  // Backend: { token, new_password }
  resetPassword: (token: string, newPassword: string) =>
    apiClient.post('/auth/reset-password', { token, new_password: newPassword }),

  googleRedirect: () => {
    window.location.href = `${process.env.NEXT_PUBLIC_API_URL}/auth/google`
  },
}
