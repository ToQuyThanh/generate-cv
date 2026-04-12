import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User, Subscription } from '@/types'
import { TOKEN_KEY, REFRESH_TOKEN_KEY } from '@/lib/api/client'

interface AuthState {
  user: User | null
  subscription: Subscription | null
  accessToken: string | null
  refreshToken: string | null
  isAuthenticated: boolean

  // AuthResponse từ backend KHÔNG có subscription (chỉ có user, access_token, refresh_token)
  // Subscription được set riêng sau khi gọi /users/me
  setAuth: (payload: {
    user: User
    access_token: string
    refresh_token: string
  }) => void
  setUser: (user: User) => void
  setSubscription: (sub: Subscription | null) => void
  clearAuth: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      subscription: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,

      setAuth: ({ user, access_token, refresh_token }) => {
        if (typeof window !== 'undefined') {
          localStorage.setItem(TOKEN_KEY, access_token)
          localStorage.setItem(REFRESH_TOKEN_KEY, refresh_token)
        }
        set({
          user,
          accessToken: access_token,
          refreshToken: refresh_token,
          isAuthenticated: true,
        })
      },

      setUser: (user) => set({ user }),

      setSubscription: (subscription) => set({ subscription }),

      clearAuth: () => {
        if (typeof window !== 'undefined') {
          localStorage.removeItem(TOKEN_KEY)
          localStorage.removeItem(REFRESH_TOKEN_KEY)
        }
        set({
          user: null,
          subscription: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
        })
      },
    }),
    {
      name: 'gcv-auth',
      partialize: (state) => ({
        user: state.user,
        subscription: state.subscription,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)
