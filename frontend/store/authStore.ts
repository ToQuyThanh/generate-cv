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
  /**
   * true sau khi Zustand persist đã hydrate xong từ localStorage.
   * Dùng để guard các API call cần token — tránh race condition khi
   * component mount trước khi hydration hoàn thành.
   */
  isHydrated: boolean

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
      isHydrated: false,

      setAuth: ({ user, access_token, refresh_token }) => {
        // Sync vào localStorage để apiClient interceptor đọc được ngay lập tức
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
      partialize: (state) => ({
        user: state.user,
        subscription: state.subscription,
        isAuthenticated: state.isAuthenticated,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        // isHydrated KHÔNG persist — luôn bắt đầu false, set true sau khi hydrate
      }),
      // Sau khi hydrate từ storage: sync token vào localStorage và đánh dấu isHydrated = true
      onRehydrateStorage: () => (state) => {
        if (state?.accessToken) {
          localStorage.setItem(TOKEN_KEY, state.accessToken)
        }
        if (state?.refreshToken) {
          localStorage.setItem(REFRESH_TOKEN_KEY, state.refreshToken)
        }
        // Luôn set true dù state null (user chưa login vẫn cần biết hydration xong)
        useAuthStore.setState({ isHydrated: true })
      },
    }
  )
)
