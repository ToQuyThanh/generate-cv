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
  const { user } = useAuthStore()
  const [cvs, setCvs] = useState<CVListItem[]>([])
  const [loading, setLoading] = useState(true)

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

  const handleRename = (id: string, newTitle: string) => {
    setCvs((prev) => prev.map((c) => c.id === id ? { ...c, title: newTitle } : c))
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
        <Button onClick={() => router.push('/cv/new')} className="gap-2">
          <Plus className="h-4 w-4" />
          Tạo CV mới
        </Button>
      </div>

      {/* CV Grid */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : cvs.length === 0 ? (
        <EmptyState onCreateCV={() => router.push('/cv/new')} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {cvs.map((cv) => (
            <CVCard
              key={cv.id}
              cv={cv}
              onDuplicate={handleDuplicate}
              onDelete={handleDelete}
              onRename={handleRename}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function EmptyState({ onCreateCV }: { onCreateCV: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed bg-muted/30 h-72 space-y-4">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
        <FileText className="h-6 w-6 text-muted-foreground" />
      </div>
      <div className="text-center">
        <p className="font-medium">Chưa có CV nào</p>
        <p className="text-sm text-muted-foreground mt-1">Tạo CV đầu tiên để bắt đầu hành trình</p>
      </div>
      <Button onClick={onCreateCV} size="sm">
        <Plus className="h-4 w-4 mr-1" />
        Tạo CV đầu tiên
      </Button>
    </div>
  )
}
