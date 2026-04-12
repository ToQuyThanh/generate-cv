import apiClient from './client'
import type { UserWithSubscription } from '@/types'

export const userApi = {
  me: () =>
    apiClient.get<UserWithSubscription>('/users/me').then((r) => r.data),

  update: (body: { full_name?: string; avatar_url?: string }) =>
    apiClient.patch<UserWithSubscription>('/users/me', body).then((r) => r.data),

  deleteAccount: () =>
    apiClient.delete('/users/me'),
}
