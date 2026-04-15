import apiClient from './client'
import type { Subscription, UserWithSubscription } from '@/types'

// Backend trả UserWithSubResponse:
//   { id, email, full_name, avatar_url, created_at, subscription? }
// Match với UserWithSubscription trong types/index.ts

export const userApi = {
  // GET /users/me — trả UserWithSubscription (subscription có thể null)
  me: () =>
    apiClient.get<UserWithSubscription>('/users/me').then((r) => r.data),

  // PATCH /users/me — trả UserWithSubscription
  updateMe: (body: { full_name?: string; avatar_url?: string }) =>
    apiClient.patch<UserWithSubscription>('/users/me', body).then((r) => r.data),

  // Keep old name for backward compat
  update: (body: { full_name?: string; avatar_url?: string }) =>
    apiClient.patch<UserWithSubscription>('/users/me', body).then((r) => r.data),

  // GET /users/me/subscription
  getSubscription: () =>
    apiClient.get<Subscription>('/users/me/subscription').then((r) => r.data),

  // DELETE /users/me
  deleteAccount: () =>
    apiClient.delete('/users/me'),
}
