'use client'

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
import { authApi } from '@/lib/api'
import { useAuthStore } from '@/store'

const schema = z.object({
  full_name: z.string().min(2, 'Họ tên ít nhất 2 ký tự'),
  email: z.string().email('Email không hợp lệ'),
  password: z
    .string()
    .min(8, 'Mật khẩu ít nhất 8 ký tự')
    .regex(/[A-Z]/, 'Phải có ít nhất 1 chữ hoa')
    .regex(/[0-9]/, 'Phải có ít nhất 1 chữ số'),
  confirm_password: z.string(),
}).refine((d) => d.password === d.confirm_password, {
  message: 'Mật khẩu không khớp',
  path: ['confirm_password'],
})
type FormData = z.infer<typeof schema>

export default function RegisterPage() {
  const router = useRouter()
  const setAuth = useAuthStore((s) => s.setAuth)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  const onSubmit = async ({ full_name, email, password }: FormData) => {
    try {
      const res = await authApi.register({ full_name, email, password })
      setAuth(res)
      toast.success('Tạo tài khoản thành công! Chào mừng bạn 🎉')
      router.push('/dashboard')
    } catch {
      toast.error('Email đã được sử dụng hoặc có lỗi xảy ra')
    }
  }

  const handleGoogleLogin = () => authApi.googleRedirect()

  return (
    <div className="min-h-screen flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-primary flex-col justify-between p-12 text-white">
        <div className="flex items-center gap-2">
          <FileText className="h-6 w-6" />
          <span className="text-xl font-bold">GenerateCV</span>
        </div>
        <div className="space-y-4">
          {[
            { icon: '✨', text: 'AI gợi ý nội dung theo JD trong vài giây' },
            { icon: '📄', text: 'Export PDF đẹp, không watermark (gói trả phí)' },
            { icon: '🎨', text: '8+ mẫu CV chuyên nghiệp, đa dạng ngành nghề' },
          ].map((item) => (
            <div key={item.text} className="flex items-start gap-3">
              <span className="text-xl">{item.icon}</span>
              <p className="text-primary-foreground/90">{item.text}</p>
            </div>
          ))}
        </div>
        <div className="text-primary-foreground/50 text-xs">
          © 2026 GenerateCV. All rights reserved.
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-sm space-y-6 animate-fade-in">
          <div className="space-y-1 text-center lg:text-left">
            <h1 className="text-2xl font-bold tracking-tight">Tạo tài khoản</h1>
            <p className="text-sm text-muted-foreground">
              Đã có tài khoản?{' '}
              <Link href="/login" className="text-primary font-medium hover:underline">
                Đăng nhập
              </Link>
            </p>
          </div>

          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={handleGoogleLogin}
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Đăng ký với Google
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">Hoặc</span>
            </div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <div className="space-y-1">
              <Label htmlFor="full_name">Họ và tên</Label>
              <Input id="full_name" placeholder="Nguyễn Văn A" {...register('full_name')} />
              {errors.full_name && (
                <p className="text-xs text-destructive">{errors.full_name.message}</p>
              )}
            </div>

            <div className="space-y-1">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="you@example.com" {...register('email')} />
              {errors.email && (
                <p className="text-xs text-destructive">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-1">
              <Label htmlFor="password">Mật khẩu</Label>
              <Input id="password" type="password" placeholder="••••••••" {...register('password')} />
              {errors.password && (
                <p className="text-xs text-destructive">{errors.password.message}</p>
              )}
            </div>

            <div className="space-y-1">
              <Label htmlFor="confirm_password">Xác nhận mật khẩu</Label>
              <Input id="confirm_password" type="password" placeholder="••••••••" {...register('confirm_password')} />
              {errors.confirm_password && (
                <p className="text-xs text-destructive">{errors.confirm_password.message}</p>
              )}
            </div>

            <Button type="submit" className="w-full" loading={isSubmitting}>
              Tạo tài khoản
            </Button>

            <p className="text-xs text-center text-muted-foreground">
              Bằng cách đăng ký, bạn đồng ý với{' '}
              <Link href="/terms" className="underline hover:text-primary">Điều khoản dịch vụ</Link>
              {' '}và{' '}
              <Link href="/privacy" className="underline hover:text-primary">Chính sách bảo mật</Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  )
}
