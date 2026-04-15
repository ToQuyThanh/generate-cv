'use client'

import { Suspense, useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { FileText, ArrowLeft, ShieldCheck, AlertTriangle } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { authApi } from '@/lib/api'

const schema = z
  .object({
    new_password: z
      .string()
      .min(8, 'Mật khẩu ít nhất 8 ký tự')
      .regex(/[A-Z]/, 'Phải có ít nhất 1 chữ hoa')
      .regex(/[0-9]/, 'Phải có ít nhất 1 chữ số'),
    confirm_password: z.string(),
  })
  .refine((d) => d.new_password === d.confirm_password, {
    message: 'Mật khẩu không khớp',
    path: ['confirm_password'],
  })
type FormData = z.infer<typeof schema>

// ─── Inner component (cần Suspense vì dùng useSearchParams) ─────────────────
function ResetPasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  const [success, setSuccess] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  // Nếu không có token → hiển thị trạng thái lỗi
  if (!token) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center w-14 h-14 rounded-full bg-red-50 mx-auto">
          <AlertTriangle className="h-7 w-7 text-wf-red" />
        </div>

        <div className="space-y-1.5 text-center">
          <h1 className="text-[26px] font-semibold tracking-[-0.03em] text-wf-black">
            Link không hợp lệ
          </h1>
          <p className="text-sm text-wf-gray-500 leading-relaxed">
            Link đặt lại mật khẩu đã hết hạn hoặc không hợp lệ.
            Vui lòng yêu cầu link mới.
          </p>
        </div>

        <Link href="/forgot-password">
          <Button className="w-full">Yêu cầu link mới</Button>
        </Link>

        <div className="text-center">
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-wf-gray-500 hover:text-wf-blue transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Quay lại đăng nhập
          </Link>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center w-14 h-14 rounded-full bg-wf-blue/10 mx-auto">
          <ShieldCheck className="h-7 w-7 text-wf-blue" />
        </div>

        <div className="space-y-1.5 text-center">
          <h1 className="text-[26px] font-semibold tracking-[-0.03em] text-wf-black">
            Đặt lại mật khẩu thành công!
          </h1>
          <p className="text-sm text-wf-gray-500 leading-relaxed">
            Mật khẩu của bạn đã được cập nhật. Bạn có thể đăng nhập bằng mật khẩu mới ngay bây giờ.
          </p>
        </div>

        <Button className="w-full" onClick={() => router.push('/login')}>
          Đăng nhập ngay
        </Button>
      </div>
    )
  }

  const onSubmit = async ({ new_password }: FormData) => {
    try {
      await authApi.resetPassword(token, new_password)
      setSuccess(true)
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error
        ?? 'Link đã hết hạn hoặc không hợp lệ. Vui lòng yêu cầu link mới.'
      toast.error(message)
    }
  }

  return (
    <>
      <div className="space-y-1.5">
        <h1 className="text-[26px] font-semibold tracking-[-0.03em] text-wf-black">
          Đặt lại mật khẩu
        </h1>
        <p className="text-sm text-wf-gray-500">
          Nhập mật khẩu mới cho tài khoản của bạn.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <div className="space-y-1.5">
          <Label htmlFor="new_password">Mật khẩu mới</Label>
          <Input
            id="new_password"
            type="password"
            placeholder="••••••••"
            autoComplete="new-password"
            autoFocus
            {...register('new_password')}
          />
          {errors.new_password && (
            <p className="text-xs text-wf-red">{errors.new_password.message}</p>
          )}
          <p className="text-[11px] text-wf-gray-300 leading-relaxed">
            Ít nhất 8 ký tự, 1 chữ hoa và 1 chữ số.
          </p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="confirm_password">Xác nhận mật khẩu</Label>
          <Input
            id="confirm_password"
            type="password"
            placeholder="••••••••"
            autoComplete="new-password"
            {...register('confirm_password')}
          />
          {errors.confirm_password && (
            <p className="text-xs text-wf-red">{errors.confirm_password.message}</p>
          )}
        </div>

        <Button type="submit" className="w-full" disabled={isSubmitting} loading={isSubmitting}>
          {isSubmitting ? 'Đang cập nhật...' : 'Đặt lại mật khẩu'}
        </Button>
      </form>

      <div className="text-center">
        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-wf-gray-500 hover:text-wf-blue transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Quay lại đăng nhập
        </Link>
      </div>
    </>
  )
}

// ─── Page wrapper — bọc Suspense cho useSearchParams ─────────────────────────
export default function ResetPasswordPage() {
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
            "Bảo mật tài khoản là ưu tiên hàng đầu. Đặt mật khẩu mạnh để bảo vệ CV của bạn."
          </p>
          <p className="text-[13px] text-white/60 uppercase tracking-[1px] font-semibold">
            Link chỉ có hiệu lực trong 15 phút
          </p>
        </div>

        <p className="text-[12px] text-white/40 uppercase tracking-[0.8px] font-semibold">© 2026 GenerateCV</p>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-sm space-y-6 animate-fade-in">
          <Suspense fallback={<div className="h-64 animate-pulse bg-wf-border rounded-lg" />}>
            <ResetPasswordForm />
          </Suspense>
        </div>
      </div>
    </div>
  )
}
