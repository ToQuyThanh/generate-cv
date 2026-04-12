'use client'

import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { FileText } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { authApi, userApi } from '@/lib/api'
import { useAuthStore } from '@/store'

const schema = z.object({
  email:    z.string().email('Email không hợp lệ'),
  password: z.string().min(6, 'Mật khẩu ít nhất 6 ký tự'),
})
type FormData = z.infer<typeof schema>

export default function LoginPage() {
  const router = useRouter()
  const { setAuth, setSubscription, isAuthenticated } = useAuthStore()

  useEffect(() => {
    if (isAuthenticated) router.replace('/dashboard')
  }, [isAuthenticated, router])

  const { register, handleSubmit, formState: { errors, isSubmitting } } =
    useForm<FormData>({ resolver: zodResolver(schema) })

  const onSubmit = async (data: FormData) => {
    try {
      const res = await authApi.login(data)
      setAuth({ user: res.user, access_token: res.access_token, refresh_token: res.refresh_token })
      try { const sub = await userApi.getSubscription(); setSubscription(sub) } catch {}
      toast.success('Đăng nhập thành công!')
      router.push('/dashboard')
    } catch {
      toast.error('Email hoặc mật khẩu không đúng')
    }
  }

  return (
    <div className="min-h-screen flex bg-white">
      {/* Left panel — WF Blue brand */}
      <div className="hidden lg:flex lg:w-1/2 bg-wf-blue flex-col justify-between p-12">
        {/* Logo */}
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded bg-white/20">
            <FileText className="h-4 w-4 text-white" />
          </div>
          <span className="text-[15px] font-semibold tracking-[-0.02em] text-white">GenerateCV</span>
        </div>

        {/* Quote */}
        <div className="space-y-4">
          <p className="text-[28px] font-semibold leading-[1.2] tracking-[-0.03em] text-white">
            "Tạo CV chuyên nghiệp trong vài phút. AI gợi ý nội dung theo đúng JD của bạn."
          </p>
          <p className="text-[13px] text-white/60 uppercase tracking-[1px] font-semibold">
            Hơn 1,000+ người dùng đã tạo CV thành công
          </p>
        </div>

        <p className="text-[12px] text-white/40 uppercase tracking-[0.8px] font-semibold">© 2026 GenerateCV</p>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-sm space-y-6 animate-fade-in">
          <div className="space-y-1.5">
            <h1 className="text-[26px] font-semibold tracking-[-0.03em] text-wf-black">Đăng nhập</h1>
            <p className="text-sm text-wf-gray-500">
              Chưa có tài khoản?{' '}
              <Link href="/register" className="text-wf-blue font-semibold hover:text-wf-blue-hover transition-colors">
                Đăng ký miễn phí
              </Link>
            </p>
          </div>

          {/* Google button */}
          <Button
            type="button"
            variant="outline"
            className="w-full gap-2.5"
            onClick={() => authApi.googleRedirect()}
          >
            <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Tiếp tục với Google
          </Button>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-wf-border" />
            </div>
            <div className="relative flex justify-center">
              <span className="wf-label bg-white px-3">Hoặc</span>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="you@example.com" autoComplete="email" {...register('email')} />
              {errors.email && <p className="text-xs text-wf-red">{errors.email.message}</p>}
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Mật khẩu</Label>
                <Link href="/forgot-password" className="text-[11px] uppercase tracking-[0.6px] font-semibold text-wf-gray-300 hover:text-wf-blue transition-colors">
                  Quên mật khẩu?
                </Link>
              </div>
              <Input id="password" type="password" placeholder="••••••••" autoComplete="current-password" {...register('password')} />
              {errors.password && <p className="text-xs text-wf-red">{errors.password.message}</p>}
            </div>

            <Button type="submit" className="w-full" disabled={isSubmitting} loading={isSubmitting}>
              {isSubmitting ? 'Đang đăng nhập...' : 'Đăng nhập'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
