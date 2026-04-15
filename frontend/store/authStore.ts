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
        // Sync vào localStorage để apiClient interceptor đọc được ngay lập tức
        // Zustand store chỉ chạy ở client (persist middleware), không cần check typeof window
        localStorage.setItem(TOKEN_KEY, access_token)
        localStorage.setItem(REFRESH_TOKEN_KEY, refresh_token)
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
        localStorage.removeItem(TOKEN_KEY)
        localStorage.removeItem(REFRESH_TOKEN_KEY)
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
      // Persist cả token để sau khi reload/navigate, Zustand hydrate đúng state
      // và interceptor có thể đọc token từ localStorage (được sync lại bởi onRehydrateStorage)
      partialize: (state) => ({
        user: state.user,
        subscription: state.subscription,
        isAuthenticated: state.isAuthenticated,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
      }),
      // Sau khi hydrate từ storage, đồng bộ lại token vào localStorage
      // để apiClient interceptor (đọc localStorage trực tiếp) có token ngay lập tức
      onRehydrateStorage: () => (state) => {
        if (!state) return
        // onRehydrateStorage chỉ chạy ở client nên không cần check typeof window
        if (state.accessToken) {
          localStorage.setItem(TOKEN_KEY, state.accessToken)
        }
        if (state.refreshToken) {
          localStorage.setItem(REFRESH_TOKEN_KEY, state.refreshToken)
        }
      },
    }
  )
)
