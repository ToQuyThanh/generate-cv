'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Link from 'next/link'
import { toast } from 'sonner'
import { FileText, ArrowLeft, MailCheck } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { authApi } from '@/lib/api'

const schema = z.object({
  email: z.string().email('Email không hợp lệ'),
})
type FormData = z.infer<typeof schema>

export default function ForgotPasswordPage() {
  const [submitted, setSubmitted] = useState(false)
  const [submittedEmail, setSubmittedEmail] = useState('')

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  const onSubmit = async ({ email }: FormData) => {
    try {
      await authApi.forgotPassword(email)
      setSubmittedEmail(email)
      setSubmitted(true)
    } catch {
      // Luôn show success để tránh email enumeration attack
      setSubmittedEmail(email)
      setSubmitted(true)
      toast.success('Nếu email tồn tại, bạn sẽ nhận được hướng dẫn đặt lại mật khẩu.')
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
            "Đừng lo — chúng tôi sẽ giúp bạn lấy lại quyền truy cập trong vài giây."
          </p>
          <p className="text-[13px] text-white/60 uppercase tracking-[1px] font-semibold">
            Kiểm tra hộp thư đến và thư rác
          </p>
        </div>

        <p className="text-[12px] text-white/40 uppercase tracking-[0.8px] font-semibold">© 2026 GenerateCV</p>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-sm space-y-6 animate-fade-in">

          {submitted ? (
            /* ── Success state ── */
            <div className="space-y-6">
              <div className="flex items-center justify-center w-14 h-14 rounded-full bg-wf-blue/10 mx-auto">
                <MailCheck className="h-7 w-7 text-wf-blue" />
              </div>

              <div className="space-y-1.5 text-center">
                <h1 className="text-[26px] font-semibold tracking-[-0.03em] text-wf-black">
                  Kiểm tra email của bạn
                </h1>
                <p className="text-sm text-wf-gray-500 leading-relaxed">
                  Chúng tôi đã gửi hướng dẫn đặt lại mật khẩu tới{' '}
                  <span className="font-semibold text-wf-black">{submittedEmail}</span>.
                  Link có hiệu lực trong <span className="font-semibold">15 phút</span>.
                </p>
              </div>

              <div className="space-y-3">
                <p className="text-[12px] text-wf-gray-300 text-center">
                  Không nhận được email? Kiểm tra thư mục Spam hoặc
                </p>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => setSubmitted(false)}
                >
                  Thử lại với email khác
                </Button>
              </div>

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
          ) : (
            /* ── Form state ── */
            <>
              <div className="space-y-1.5">
                <h1 className="text-[26px] font-semibold tracking-[-0.03em] text-wf-black">
                  Quên mật khẩu?
                </h1>
                <p className="text-sm text-wf-gray-500">
                  Nhập email của bạn và chúng tôi sẽ gửi link đặt lại mật khẩu.
                </p>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    autoComplete="email"
                    autoFocus
                    {...register('email')}
                  />
                  {errors.email && (
                    <p className="text-xs text-wf-red">{errors.email.message}</p>
                  )}
                </div>

                <Button type="submit" className="w-full" disabled={isSubmitting} loading={isSubmitting}>
                  {isSubmitting ? 'Đang gửi...' : 'Gửi link đặt lại mật khẩu'}
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
          )}
        </div>
      </div>
    </div>
  )
}
