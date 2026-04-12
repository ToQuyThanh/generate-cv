import apiClient from './client'
import type { AuthResponse, LoginRequest, RegisterRequest } from '@/types'

export const authApi = {
  login: (body: LoginRequest) =>
    apiClient.post<AuthResponse>('/auth/login', body).then((r) => r.data),

  register: (body: RegisterRequest) =>
    apiClient.post<AuthResponse>('/auth/register', body).then((r) => r.data),

  logout: (refreshToken: string) =>
    apiClient.post('/auth/logout', { refresh_token: refreshToken }),

  forgotPassword: (email: string) =>
    apiClient.post('/auth/forgot-password', { email }),

  resetPassword: (token: string, password: string) =>
    apiClient.post('/auth/reset-password', { token, password }),

  googleRedirect: () => {
    window.location.href = `${process.env.NEXT_PUBLIC_API_URL}/auth/google`
  },
}
