'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { FileText, LayoutDashboard, LogOut, Sparkles, PlusCircle, Settings, HelpCircle, ChevronsUpDown, CreditCard, X, Menu } from 'lucide-react'
import { toast } from 'sonner'
import { useState, useRef, useEffect } from 'react'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { useAuthStore } from '@/store'
import { authApi } from '@/lib/api'
import { cn, getPlanLabel } from '@/lib/utils'
import { REFRESH_TOKEN_KEY } from '@/lib/api/client'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/cv/new', label: 'Tạo CV mới', icon: PlusCircle },
]

// ─── Nội dung sidebar (dùng chung cho desktop & mobile drawer) ───────────────
function SidebarContent({
  onNavigate,
}: {
  onNavigate?: () => void
}) {
  const pathname = usePathname()
  const router = useRouter()
  const { user, subscription, clearAuth } = useAuthStore()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

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

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    if (menuOpen) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [menuOpen])

  const initials =
    user?.full_name
      ?.split(' ')
      .slice(-2)
      .map((n) => n[0])
      .join('')
      .toUpperCase() ?? 'U'

  return (
    <div className="flex h-full flex-col">
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
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive =
            pathname === href ||
            (href === '/cv/new' && (pathname === '/cv/new' || pathname === '/templates'))

          return (
            <Link
              key={href}
              href={href}
              onClick={onNavigate}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          )
        })}
      </nav>

      <Separator />

      {/* User info + popup menu */}
      <div className="p-4" ref={menuRef}>
        <div className="relative">
          {/* Popup menu - mở lên trên */}
          {menuOpen && (
            <div className="absolute bottom-full left-0 right-0 mb-2 rounded-lg border bg-card shadow-lg overflow-hidden z-50">
              <div className="px-3 py-2 border-b">
                <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
              </div>

              <div className="py-1">
                <Link
                  href="/settings"
                  onClick={() => { setMenuOpen(false); onNavigate?.() }}
                  className="flex items-center gap-3 px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground transition-colors"
                >
                  <Settings className="h-4 w-4" />
                  Cài đặt
                </Link>

                <Link
                  href="/pricing"
                  onClick={() => { setMenuOpen(false); onNavigate?.() }}
                  className="flex items-center gap-3 px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground transition-colors"
                >
                  <CreditCard className="h-4 w-4" />
                  Nâng cấp plan
                  {subscription?.plan === 'free' && (
                    <Sparkles className="h-3 w-3 text-yellow-500 ml-auto" />
                  )}
                </Link>

                <Link
                  href="/help"
                  onClick={() => { setMenuOpen(false); onNavigate?.() }}
                  className="flex items-center gap-3 px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground transition-colors"
                >
                  <HelpCircle className="h-4 w-4" />
                  Trợ giúp
                </Link>
              </div>

              <Separator />

              <div className="py-1">
                <button
                  onClick={handleLogout}
                  className="flex w-full items-center gap-3 px-3 py-2 text-sm text-destructive hover:bg-accent transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                  Đăng xuất
                </button>
              </div>
            </div>
          )}

          {/* Trigger button */}
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="flex w-full items-center gap-3 rounded-lg px-2 py-2 hover:bg-accent transition-colors"
          >
            <Avatar className="h-8 w-8 shrink-0">
              <AvatarImage src={user?.avatar_url ?? undefined} alt={user?.full_name} />
              <AvatarFallback className="text-xs">{initials}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1 text-left">
              <p className="text-sm font-medium truncate">{user?.full_name}</p>
              {subscription && (
                <p className="text-xs text-muted-foreground">{getPlanLabel(subscription.plan)}</p>
              )}
            </div>
            <ChevronsUpDown className="h-4 w-4 text-muted-foreground shrink-0" />
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Mobile Header (topbar) ──────────────────────────────────────────────────
export function MobileHeader() {
  const [drawerOpen, setDrawerOpen] = useState(false)

  // Khoá scroll body khi drawer mở
  useEffect(() => {
    document.body.style.overflow = drawerOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [drawerOpen])

  return (
    <>
      {/* Topbar */}
      <header className="flex items-center justify-between border-b bg-card px-4 py-3 md:hidden">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <FileText className="h-3.5 w-3.5" />
          </div>
          <span className="font-bold">GenerateCV</span>
        </div>
        <button
          onClick={() => setDrawerOpen(true)}
          className="flex h-8 w-8 items-center justify-center rounded-md hover:bg-accent transition-colors"
          aria-label="Mở menu"
        >
          <Menu className="h-5 w-5" />
        </button>
      </header>

      {/* Overlay */}
      {drawerOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setDrawerOpen(false)}
        />
      )}

      {/* Drawer */}
      <div
        className={cn(
          'fixed left-0 top-0 z-50 h-full w-72 bg-card shadow-xl transition-transform duration-300 md:hidden',
          drawerOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Nút đóng */}
        <button
          onClick={() => setDrawerOpen(false)}
          className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-md hover:bg-accent transition-colors"
          aria-label="Đóng menu"
        >
          <X className="h-4 w-4" />
        </button>

        <SidebarContent onNavigate={() => setDrawerOpen(false)} />
      </div>
    </>
  )
}

// ─── Desktop Sidebar ─────────────────────────────────────────────────────────
export function Sidebar() {
  return (
    <aside className="hidden md:flex h-screen w-64 flex-col border-r bg-card">
      <SidebarContent />
    </aside>
  )
}
