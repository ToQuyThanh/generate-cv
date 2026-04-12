'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { FileText, LayoutDashboard, Settings, LogOut, CreditCard, Sparkles } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { useAuthStore } from '@/store'
import { authApi } from '@/lib/api'
import { cn, getPlanLabel, getPlanColor } from '@/lib/utils'
import { REFRESH_TOKEN_KEY } from '@/lib/api/client'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/cv/new', label: 'Tạo CV mới', icon: FileText },
  { href: '/pricing', label: 'Nâng cấp', icon: CreditCard },
  { href: '/settings', label: 'Cài đặt', icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { user, subscription, clearAuth } = useAuthStore()

  const handleLogout = async () => {
    try {
      const rt = localStorage.getItem(REFRESH_TOKEN_KEY) ?? ''
      await authApi.logout(rt)
    } finally {
      clearAuth()
      toast.success('Đã đăng xuất')
      router.push('/login')
    }
  }

  const initials = user?.full_name
    ?.split(' ')
    .slice(-2)
    .map((n) => n[0])
    .join('')
    .toUpperCase() ?? 'U'

  return (
    <aside className="flex h-screen w-64 flex-col border-r bg-card">
      {/* Logo */}
      <div className="flex items-center gap-2 p-6">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <FileText className="h-4 w-4" />
        </div>
        <span className="text-lg font-bold">GenerateCV</span>
      </div>

      <Separator />

      {/* Nav */}
      <nav className="flex-1 space-y-1 p-4">
        {navItems.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
              pathname === href
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
            {href === '/pricing' && subscription?.plan === 'free' && (
              <span className="ml-auto">
                <Sparkles className="h-3 w-3 text-yellow-500" />
              </span>
            )}
          </Link>
        ))}
      </nav>

      <Separator />

      {/* User info */}
      <div className="p-4 space-y-3">
        {subscription && (
          <div className={cn('rounded-lg px-3 py-2 text-xs font-medium text-center', getPlanColor(subscription.plan))}>
            {getPlanLabel(subscription.plan)}
            {subscription.expires_at && (
              <span className="ml-1 opacity-70">
                · hết {new Date(subscription.expires_at).toLocaleDateString('vi-VN')}
              </span>
            )}
          </div>
        )}
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarImage src={user?.avatar_url ?? undefined} alt={user?.full_name} />
            <AvatarFallback className="text-xs">{initials}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium truncate">{user?.full_name}</p>
            <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-2 text-muted-foreground"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4" />
          Đăng xuất
        </Button>
      </div>
    </aside>
  )
}
