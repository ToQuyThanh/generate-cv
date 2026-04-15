'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  FileText,
  LayoutDashboard,
  LogOut,
  Sparkles,
  PlusCircle,
  Settings,
  HelpCircle,
  ChevronsUpDown,
  CreditCard,
  X,
  Menu,
  Database,
} from 'lucide-react'
import { toast } from 'sonner'
import { useState, useRef, useEffect } from 'react'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { useAuthStore, useProfileStore } from '@/store'
import { authApi } from '@/lib/api'
import { cn, getPlanLabel } from '@/lib/utils'
import { REFRESH_TOKEN_KEY } from '@/lib/api/client'

const navItems = [
  { href: '/dashboard', label: 'Dashboard',  icon: LayoutDashboard },
  { href: '/profiles',  label: 'Dữ liệu CV', icon: Database, showBadge: true },
  { href: '/cv/new',    label: 'Tạo CV mới', icon: PlusCircle },
]

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname()
  const router = useRouter()
  const { user, subscription, clearAuth } = useAuthStore()
  const { profiles, fetchProfiles } = useProfileStore()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Fetch profiles count khi sidebar mount
  useEffect(() => {
    fetchProfiles().catch(() => {/* silent */})
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleLogout = async () => {
    try {
      await authApi.logout()
    } finally {
      clearAuth()
      toast.success('Đã đăng xuất')
      router.push('/login')
    }
  }

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    if (menuOpen) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [menuOpen])

  const initials =
    user?.full_name?.split(' ').slice(-2).map((n) => n[0]).join('').toUpperCase() ?? 'U'

  return (
    <div className="flex h-full flex-col bg-white">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 py-5">
        <div className="flex h-8 w-8 items-center justify-center rounded bg-wf-blue">
          <FileText className="h-4 w-4 text-white" />
        </div>
        <span className="text-[15px] font-semibold tracking-[-0.02em] text-wf-black">GenerateCV</span>
      </div>

      <div className="mx-4 h-px bg-wf-border" />

      {/* Nav */}
      <nav className="flex-1 space-y-0.5 p-3 pt-3">
        {navItems.map(({ href, label, icon: Icon, showBadge }) => {
          const isActive =
            pathname === href ||
            (href === '/cv/new' && (pathname === '/cv/new' || pathname === '/templates')) ||
            (href === '/profiles' && pathname.startsWith('/profiles'))

          const profileCount = showBadge ? profiles.length : 0

          return (
            <Link
              key={href}
              href={href}
              onClick={onNavigate}
              className={cn(
                'flex items-center gap-3 rounded px-3 py-2 text-sm font-medium transition-all duration-150',
                isActive
                  ? 'bg-wf-blue text-white shadow-wf-sm'
                  : 'text-wf-gray-500 hover:bg-[rgba(20,110,245,0.06)] hover:text-wf-blue'
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="flex-1">{label}</span>
              {showBadge && profileCount > 0 && (
                <span
                  className={cn(
                    'ml-auto text-[11px] font-semibold px-1.5 py-0.5 rounded-full min-w-[20px] text-center leading-none',
                    isActive
                      ? 'bg-white/20 text-white'
                      : 'bg-[rgba(20,110,245,0.1)] text-wf-blue'
                  )}
                >
                  {profileCount}
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      <div className="mx-4 h-px bg-wf-border" />

      {/* User popup */}
      <div className="p-3" ref={menuRef}>
        <div className="relative">
          {menuOpen && (
            <div className="absolute bottom-full left-0 right-0 mb-2 rounded-lg border border-wf-border bg-white shadow-wf overflow-hidden z-50">
              <div className="px-3 py-2 border-b border-wf-border">
                <p className="text-xs text-wf-gray-300 truncate">{user?.email}</p>
              </div>
              <div className="py-1">
                <Link
                  href="/settings"
                  onClick={() => { setMenuOpen(false); onNavigate?.() }}
                  className="flex items-center gap-3 px-3 py-2 text-sm text-wf-gray-700 hover:bg-[rgba(20,110,245,0.05)] hover:text-wf-blue transition-colors"
                >
                  <Settings className="h-4 w-4" /> Cài đặt
                </Link>
                <Link
                  href="/pricing"
                  onClick={() => { setMenuOpen(false); onNavigate?.() }}
                  className="flex items-center gap-3 px-3 py-2 text-sm text-wf-gray-700 hover:bg-[rgba(20,110,245,0.05)] hover:text-wf-blue transition-colors"
                >
                  <CreditCard className="h-4 w-4" />
                  Nâng cấp plan
                  {subscription?.plan === 'free' && (
                    <Sparkles className="h-3 w-3 text-wf-yellow ml-auto" />
                  )}
                </Link>
                <Link
                  href="/help"
                  onClick={() => { setMenuOpen(false); onNavigate?.() }}
                  className="flex items-center gap-3 px-3 py-2 text-sm text-wf-gray-700 hover:bg-[rgba(20,110,245,0.05)] hover:text-wf-blue transition-colors"
                >
                  <HelpCircle className="h-4 w-4" /> Trợ giúp
                </Link>
              </div>
              <div className="h-px bg-wf-border" />
              <div className="py-1">
                <button
                  onClick={handleLogout}
                  className="flex w-full items-center gap-3 px-3 py-2 text-sm text-wf-red hover:bg-[rgba(238,29,54,0.05)] transition-colors"
                >
                  <LogOut className="h-4 w-4" /> Đăng xuất
                </button>
              </div>
            </div>
          )}

          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="flex w-full items-center gap-3 rounded px-2 py-2 hover:bg-[rgba(20,110,245,0.05)] transition-colors"
          >
            <Avatar className="h-8 w-8 shrink-0 rounded">
              <AvatarImage src={user?.avatar_url ?? undefined} alt={user?.full_name} />
              <AvatarFallback className="rounded text-xs bg-wf-blue text-white font-semibold">{initials}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1 text-left">
              <p className="text-sm font-semibold truncate text-wf-black">{user?.full_name}</p>
              {subscription && (
                <p className="text-[11px] text-wf-gray-300 uppercase tracking-[0.5px]">{getPlanLabel(subscription.plan)}</p>
              )}
            </div>
            <ChevronsUpDown className="h-4 w-4 text-wf-gray-300 shrink-0" />
          </button>
        </div>
      </div>
    </div>
  )
}

export function MobileHeader() {
  const [drawerOpen, setDrawerOpen] = useState(false)

  useEffect(() => {
    document.body.style.overflow = drawerOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [drawerOpen])

  return (
    <>
      <header className="flex items-center justify-between border-b border-wf-border bg-white px-4 py-3 md:hidden">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded bg-wf-blue">
            <FileText className="h-3.5 w-3.5 text-white" />
          </div>
          <span className="font-semibold text-wf-black tracking-[-0.02em]">GenerateCV</span>
        </div>
        <button
          onClick={() => setDrawerOpen(true)}
          className="flex h-8 w-8 items-center justify-center rounded hover:bg-[rgba(20,110,245,0.06)] transition-colors"
          aria-label="Mở menu"
        >
          <Menu className="h-5 w-5 text-wf-gray-700" />
        </button>
      </header>

      {drawerOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          onClick={() => setDrawerOpen(false)}
        />
      )}

      <div
        className={cn(
          'fixed left-0 top-0 z-50 h-full w-72 bg-white shadow-wf transition-transform duration-300 md:hidden',
          drawerOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <button
          onClick={() => setDrawerOpen(false)}
          className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded hover:bg-[rgba(0,0,0,0.05)] transition-colors"
          aria-label="Đóng menu"
        >
          <X className="h-4 w-4 text-wf-gray-700" />
        </button>
        <SidebarContent onNavigate={() => setDrawerOpen(false)} />
      </div>
    </>
  )
}

export function Sidebar() {
  return (
    <aside className="hidden md:flex h-screen w-64 flex-col border-r border-wf-border bg-white">
      <SidebarContent />
    </aside>
  )
}
