'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Sidebar, MobileHeader } from '@/components/shared/Sidebar'
import { useAuthStore } from '@/store'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  // Zustand persist cần 1 tick để hydrate từ localStorage — track trạng thái này
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    // Sau khi mount (client-side), Zustand đã hydrate xong
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (hydrated && !isAuthenticated) {
      router.replace('/login')
    }
  }, [hydrated, isAuthenticated, router])

  // Chưa hydrate hoặc chưa xác thực → không render gì cả
  // Tránh các page con mount sớm và gọi API khi chưa có token
  if (!hydrated || !isAuthenticated) return null

  return (
    <div className="flex h-screen overflow-hidden bg-white">
      {/* Desktop sidebar */}
      <Sidebar />

      {/* Mobile: topbar + drawer bên trong */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <MobileHeader />
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
