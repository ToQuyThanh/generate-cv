'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Loader2, Crown, LogOut, CheckCircle2, XCircle, Clock, ChevronRight,
} from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { userApi, authApi, paymentApi } from '@/lib/api'
import { useAuthStore } from '@/store'
import { getPlanLabel, getPlanColor, formatDate } from '@/lib/utils'
import type { PaymentTransaction } from '@/types'

// ─── Schemas ───────────────────────────────────────────────────────────────

const profileSchema = z.object({
  full_name: z.string().min(2, 'Tên phải có ít nhất 2 ký tự'),
})

type ProfileForm = z.infer<typeof profileSchema>

// ─── Payment history helpers ────────────────────────────────────────────────

const PLAN_LABEL: Record<string, string> = {
  weekly: 'Gói Tuần',
  monthly: 'Gói Tháng',
}

const METHOD_LABEL: Record<string, string> = {
  vnpay: 'VNPay',
  momo: 'MoMo',
}

function StatusIcon({ status }: { status: PaymentTransaction['status'] }) {
  if (status === 'success') return <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
  if (status === 'failed') return <XCircle className="h-4 w-4 text-destructive shrink-0" />
  return <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
}

function statusText(status: PaymentTransaction['status']) {
  const map: Record<PaymentTransaction['status'], string> = {
    success: 'Thành công',
    failed: 'Thất bại',
    pending: 'Đang xử lý',
    refunded: 'Hoàn tiền',
  }
  return map[status] ?? status
}

function formatVND(amount: number) {
  return new Intl.NumberFormat('vi-VN').format(amount) + 'đ'
}

// ─── Page ───────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const router = useRouter()
  const { user, subscription, setUser, setSubscription, clearAuth } = useAuthStore()

  const profileForm = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: { full_name: user?.full_name ?? '' },
  })

  const [savingProfile, setSavingProfile] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)

  // Payment history
  const [txns, setTxns] = useState<PaymentTransaction[]>([])
  const [txnLoading, setTxnLoading] = useState(true)
  const [txnTotal, setTxnTotal] = useState(0)
  const [txnPage, setTxnPage] = useState(1)
  const PAGE_SIZE = 5

  useEffect(() => {
    setTxnLoading(true)
    paymentApi
      .history(txnPage, PAGE_SIZE)
      .then((res) => {
        setTxns(res.data)
        setTxnTotal(res.meta.total)
      })
      .catch(() => {
        // Không hiện lỗi cho user nếu chỉ là lỗi load lịch sử
      })
      .finally(() => setTxnLoading(false))
  }, [txnPage])

  const totalPages = Math.ceil(txnTotal / PAGE_SIZE)

  // PATCH /users/me
  const onSaveProfile = async (data: ProfileForm) => {
    setSavingProfile(true)
    try {
      const updated = await userApi.updateMe({ full_name: data.full_name })
      setUser(updated)
      if (updated.subscription) setSubscription(updated.subscription)
      toast.success('Đã cập nhật thông tin')
    } catch {
      toast.error('Cập nhật thất bại. Thử lại sau.')
    } finally {
      setSavingProfile(false)
    }
  }

  // POST /auth/logout
  const handleLogout = async () => {
    setLoggingOut(true)
    try {
      await authApi.logout()
    } finally {
      clearAuth()
      router.push('/login')
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-8 space-y-8 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Cài đặt tài khoản</h1>
        <p className="text-sm text-muted-foreground mt-1">Quản lý thông tin cá nhân và bảo mật</p>
      </div>

      {/* ── Gói dịch vụ ─────────────────────────────────────────────────── */}
      <Section title="Gói dịch vụ">
        <div className="flex items-center justify-between rounded-xl border p-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Badge className={getPlanColor(subscription?.plan ?? 'free')}>
                {getPlanLabel(subscription?.plan ?? 'free')}
              </Badge>
              {subscription?.plan !== 'free' && (
                <Crown className="h-4 w-4 text-amber-500" />
              )}
            </div>
            {subscription?.expires_at && (
              <p className="text-xs text-muted-foreground">
                Hết hạn: {formatDate(subscription.expires_at)}
              </p>
            )}
          </div>
          {subscription?.plan === 'free' ? (
            <Button size="sm" onClick={() => router.push('/pricing')}>
              Nâng cấp
            </Button>
          ) : (
            <Button
              size="sm"
              variant="outline"
              onClick={() => router.push('/pricing')}
            >
              Gia hạn
            </Button>
          )}
        </div>
      </Section>

      {/* ── Lịch sử thanh toán ──────────────────────────────────────────── */}
      <Section title="Lịch sử thanh toán">
        {txnLoading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : txns.length === 0 ? (
          <div className="rounded-lg bg-muted/50 p-4 text-sm text-muted-foreground text-center">
            Chưa có giao dịch nào.{' '}
            <button
              onClick={() => router.push('/pricing')}
              className="underline underline-offset-2 hover:text-foreground transition-colors"
            >
              Nâng cấp ngay
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {txns.map((txn) => (
              <div
                key={txn.id}
                className="flex items-center gap-3 rounded-xl border px-4 py-3 text-sm"
              >
                <StatusIcon status={txn.status} />
                <div className="flex-1 min-w-0">
                  <p className="font-medium">
                    {PLAN_LABEL[txn.plan] ?? txn.plan}
                    <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                      qua {METHOD_LABEL[txn.method] ?? txn.method}
                    </span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {txn.paid_at ? formatDate(txn.paid_at) : formatDate(txn.created_at)}
                    {' · '}
                    <span className={
                      txn.status === 'success'
                        ? 'text-green-600'
                        : txn.status === 'failed'
                        ? 'text-destructive'
                        : 'text-muted-foreground'
                    }>
                      {statusText(txn.status)}
                    </span>
                  </p>
                </div>
                <span className="font-semibold tabular-nums shrink-0">
                  {formatVND(txn.amount_vnd)}
                </span>
              </div>
            ))}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-2">
                <p className="text-xs text-muted-foreground">
                  Trang {txnPage}/{totalPages} · {txnTotal} giao dịch
                </p>
                <div className="flex gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 px-2 text-xs"
                    disabled={txnPage <= 1}
                    onClick={() => setTxnPage((p) => p - 1)}
                  >
                    ← Trước
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 px-2 text-xs gap-1"
                    disabled={txnPage >= totalPages}
                    onClick={() => setTxnPage((p) => p + 1)}
                  >
                    Tiếp <ChevronRight className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </Section>

      {/* ── Thông tin cá nhân ───────────────────────────────────────────── */}
      <Section title="Thông tin cá nhân">
        <form onSubmit={profileForm.handleSubmit(onSaveProfile)} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Email</Label>
            <Input value={user?.email ?? ''} disabled className="bg-muted text-muted-foreground" />
          </div>
          <div className="space-y-1.5">
            <Label>Họ và tên</Label>
            <Input
              {...profileForm.register('full_name')}
              placeholder="Nguyễn Văn A"
            />
            {profileForm.formState.errors.full_name && (
              <p className="text-xs text-destructive">
                {profileForm.formState.errors.full_name.message}
              </p>
            )}
          </div>
          <Button type="submit" size="sm" disabled={savingProfile} className="gap-2">
            {savingProfile && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Lưu thay đổi
          </Button>
        </form>
      </Section>

      {/* ── Bảo mật ─────────────────────────────────────────────────────── */}
      <Section title="Bảo mật">
        <div className="rounded-lg bg-muted/50 p-4 text-sm text-muted-foreground">
          <p className="font-medium text-foreground mb-1">Đổi mật khẩu</p>
          <p>
            Tính năng đổi mật khẩu sẽ sớm được cập nhật. Hiện tại bạn có thể dùng &quot;Quên mật
            khẩu&quot; từ trang đăng nhập.
          </p>
        </div>
      </Section>

      {/* ── Tài khoản ───────────────────────────────────────────────────── */}
      <Section title="Tài khoản">
        <Button
          variant="outline"
          className="gap-2 text-destructive border-destructive/30 hover:bg-destructive/5"
          onClick={handleLogout}
          disabled={loggingOut}
        >
          {loggingOut ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <LogOut className="h-4 w-4" />
          )}
          Đăng xuất
        </Button>
      </Section>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border bg-card p-6 space-y-4">
      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
        {title}
      </h2>
      {children}
    </div>
  )
}
