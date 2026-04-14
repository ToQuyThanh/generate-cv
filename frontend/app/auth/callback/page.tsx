'use client'

import { useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { FileText } from 'lucide-react'

import { useAuthStore } from '@/store'
import { userApi } from '@/lib/api'
import { TOKEN_KEY, REFRESH_TOKEN_KEY } from '@/lib/api/client'

// Error messages tiếng Việt
const ERROR_MESSAGES: Record<string, string> = {
  missing_code: 'Không nhận được mã xác thực từ Google.',
  oauth_exchange_failed: 'Không thể xác thực với Google. Vui lòng thử lại.',
  userinfo_failed: 'Không thể lấy thông tin từ Google.',
  service_unavailable: 'Dịch vụ đăng nhập tạm thời không khả dụng.',
  login_failed: 'Đăng nhập thất bại. Vui lòng thử lại.',
  oauth_failed: 'Đăng nhập Google thất bại.',
}

function CallbackContent() {
  const router = useRouter()
  const params = useSearchParams()
  const { setAuth, setSubscription } = useAuthStore()

  useEffect(() => {
    const accessToken = params.get('access_token')
    const refreshToken = params.get('refresh_token')
    const errorCode = params.get('error')

    // Có lỗi từ backend
    if (errorCode) {
      const msg = ERROR_MESSAGES[errorCode] ?? ERROR_MESSAGES.oauth_failed
      toast.error(msg)
      router.replace('/login')
      return
    }

    // Thiếu token
    if (!accessToken || !refreshToken) {
      toast.error(ERROR_MESSAGES.oauth_failed)
      router.replace('/login')
      return
    }

    // Lưu token trước để apiClient có thể dùng khi gọi /users/me
    if (typeof window !== 'undefined') {
      localStorage.setItem(TOKEN_KEY, accessToken)
      localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken)
    }

    // Lấy thông tin user và subscription
    const finishLogin = async () => {
      try {
        const user = await userApi.me()
        setAuth({
          user,
          access_token: accessToken,
          refresh_token: refreshToken,
        })

        try {
          const sub = await userApi.getSubscription()
          setSubscription(sub)
        } catch {
          // subscription lỗi không chặn login
        }

        toast.success('Đăng nhập Google thành công!')
        router.replace('/dashboard')
      } catch {
        // Dọn token nếu /users/me fail
        if (typeof window !== 'undefined') {
          localStorage.removeItem(TOKEN_KEY)
          localStorage.removeItem(REFRESH_TOKEN_KEY)
        }
        toast.error('Đăng nhập thất bại. Vui lòng thử lại.')
        router.replace('/login')
      }
    }

    finishLogin()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-white">
      {/* Logo */}
      <div className="flex items-center gap-2.5 mb-2">
        <div className="flex h-8 w-8 items-center justify-center rounded bg-wf-blue/10">
          <FileText className="h-4 w-4 text-wf-blue" />
        </div>
        <span className="text-[15px] font-semibold tracking-[-0.02em] text-wf-black">GenerateCV</span>
      </div>

      {/* Spinner */}
      <div className="h-8 w-8 rounded-full border-2 border-wf-blue border-t-transparent animate-spin" />

      <p className="text-sm text-wf-gray-500">Đang hoàn tất đăng nhập...</p>
    </div>
  )
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-white">
          <div className="h-8 w-8 rounded-full border-2 border-wf-blue border-t-transparent animate-spin" />
        </div>
      }
    >
      <CallbackContent />
    </Suspense>
  )
}
