'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, FileText, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { CVCard } from '@/components/cv/CVCard'
import { cvApi } from '@/lib/api'
import { useAuthStore } from '@/store'
import type { CVListItem } from '@/types'

export default function DashboardPage() {
  const router = useRouter()
  const { user, subscription } = useAuthStore()
  const [cvs, setCvs] = useState<CVListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)

  const fetchCVs = useCallback(async () => {
    try {
      const res = await cvApi.list()
      setCvs(res.data)
    } catch {
      toast.error('Không thể tải danh sách CV')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchCVs()
  }, [fetchCVs])

  const handleCreateCV = async () => {
    // Redirect sang trang chọn template thay vì tạo thẳng
    router.push('/cv/new')
  }

  const handleDuplicate = async (id: string) => {
    try {
      const newCV = await cvApi.duplicate(id)
      setCvs((prev) => [newCV, ...prev])
      toast.success('Đã nhân đôi CV!')
    } catch {
      toast.error('Không thể nhân đôi CV')
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await cvApi.delete(id)
      setCvs((prev) => prev.filter((c) => c.id !== id))
      toast.success('Đã xóa CV')
    } catch {
      toast.error('Không thể xóa CV')
    }
  }

  const firstName = user?.full_name?.split(' ').at(-1) ?? 'bạn'

  return (
    <div className="p-8 space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Xin chào, {firstName} 👋
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {cvs.length > 0
              ? `Bạn có ${cvs.length} CV. Chọn một CV để chỉnh sửa hoặc tạo mới.`
              : 'Bắt đầu tạo CV đầu tiên của bạn ngay hôm nay.'}
          </p>
        </div>
        <Button onClick={handleCreateCV} disabled={creating} className="gap-2">
          <Plus className="h-4 w-4" />
          Tạo CV mới
        </Button>
      </div>

      {/* Subscription banner cho free user */}
      {subscription?.plan === 'free' && cvs.length > 0 && (
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">✨ Nâng cấp để dùng AI & export PDF không watermark</p>
            <p className="text-xs text-muted-foreground mt-0.5">Chỉ từ 29.000đ/tuần</p>
          </div>
          <Button size="sm" onClick={() => router.push('/pricing')}>
            Nâng cấp ngay
          </Button>
        </div>
      )}

      {/* CV Grid */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : cvs.length === 0 ? (
        <EmptyState onCreateCV={handleCreateCV} creating={creating} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {cvs.map((cv) => (
            <CVCard
              key={cv.id}
              cv={cv}
              onDuplicate={handleDuplicate}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function EmptyState({ onCreateCV, creating }: { onCreateCV: () => void; creating: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed bg-muted/30 h-72 space-y-4">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
        <FileText className="h-6 w-6 text-muted-foreground" />
      </div>
      <div className="text-center">
        <p className="font-medium">Chưa có CV nào</p>
        <p className="text-sm text-muted-foreground mt-1">Tạo CV đầu tiên để bắt đầu hành trình</p>
      </div>
      <Button onClick={onCreateCV} disabled={creating} size="sm">
        <Plus className="h-4 w-4 mr-1" />
        Tạo CV đầu tiên
      </Button>
    </div>
  )
}
