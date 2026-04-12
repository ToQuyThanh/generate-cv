'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2, Crown, LogOut } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { userApi, authApi } from '@/lib/api'
import { useAuthStore } from '@/store'
import { getPlanLabel, getPlanColor, formatDate } from '@/lib/utils'

// ─── Schemas ───────────────────────────────────────────────────────────────

const profileSchema = z.object({
  full_name: z.string().min(2, 'Tên phải có ít nhất 2 ký tự'),
})

type ProfileForm = z.infer<typeof profileSchema>

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

  // PATCH /users/me — backend nhận { full_name?, avatar_url? }
  // trả UserWithSubscription
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

  // POST /auth/logout — body: { refresh_token }
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

      {/* Subscription info */}
      <Section title="Gói dịch vụ">
        <div className="flex items-center justify-between rounded-xl border p-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Badge className={getPlanLabel(subscription?.plan ?? 'free') ? getPlanColor(subscription?.plan ?? 'free') : ''}>
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
          {subscription?.plan === 'free' && (
            <Button size="sm" onClick={() => router.push('/pricing')}>
              Nâng cấp
            </Button>
          )}
        </div>
      </Section>

      {/* Profile */}
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
              <p className="text-xs text-destructive">{profileForm.formState.errors.full_name.message}</p>
            )}
          </div>
          <Button type="submit" size="sm" disabled={savingProfile} className="gap-2">
            {savingProfile && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Lưu thay đổi
          </Button>
        </form>
      </Section>

      {/* Note: Đổi mật khẩu sẽ được thêm khi backend implement endpoint */}
      <Section title="Bảo mật">
        <div className="rounded-lg bg-muted/50 p-4 text-sm text-muted-foreground">
          <p className="font-medium text-foreground mb-1">Đổi mật khẩu</p>
          <p>Tính năng đổi mật khẩu sẽ sớm được cập nhật. Hiện tại bạn có thể dùng &quot;Quên mật khẩu&quot; từ trang đăng nhập.</p>
        </div>
      </Section>

      {/* Danger zone */}
      <Section title="Tài khoản">
        <Button
          variant="outline"
          className="gap-2 text-destructive border-destructive/30 hover:bg-destructive/5"
          onClick={handleLogout}
          disabled={loggingOut}
        >
          {loggingOut ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
          Đăng xuất
        </Button>
      </Section>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border bg-card p-6 space-y-4">
      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">{title}</h2>
      {children}
    </div>
  )
}
