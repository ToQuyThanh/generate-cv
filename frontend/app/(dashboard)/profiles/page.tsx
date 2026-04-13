'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Plus,
  Database,
  Loader2,
  MoreHorizontal,
  Pencil,
  Trash2,
  Star,
  FileText,
  Copy,
  User,
} from 'lucide-react'
import { toast } from 'sonner'
import { formatDistanceToNow } from 'date-fns'
import { vi } from 'date-fns/locale'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useProfileStore } from '@/store'
import { cn } from '@/lib/utils'
import type { CVProfileListItem } from '@/types'

// ── Create Profile Modal ────────────────────────────────────────────────────

function CreateProfileModal({
  open,
  onClose,
  onCreate,
}: {
  open: boolean
  onClose: () => void
  onCreate: (name: string, roleTarget: string) => Promise<void>
}) {
  const [name, setName] = useState('')
  const [roleTarget, setRoleTarget] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    if (!name.trim()) return
    setLoading(true)
    try {
      await onCreate(name.trim(), roleTarget.trim())
      setName('')
      setRoleTarget('')
      onClose()
    } finally {
      setLoading(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-lg border border-wf-border shadow-wf w-full max-w-md mx-4 p-6 space-y-4">
        <div>
          <h2 className="text-[15px] font-semibold text-wf-black">Tạo profile mới</h2>
          <p className="text-sm text-wf-gray-500 mt-0.5">
            Mỗi profile là một bộ dữ liệu CV riêng biệt
          </p>
        </div>

        <div className="space-y-3">
          <div>
            <label className="wf-label mb-1.5 block">Tên profile *</label>
            <input
              autoFocus
              type="text"
              placeholder="VD: Senior Backend Engineer"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              className="w-full rounded border border-wf-border px-3 py-2 text-sm text-wf-black placeholder:text-wf-gray-300 focus:outline-none focus:border-wf-blue transition-colors"
            />
          </div>
          <div>
            <label className="wf-label mb-1.5 block">Vị trí mục tiêu</label>
            <input
              type="text"
              placeholder="VD: Software Engineer"
              value={roleTarget}
              onChange={(e) => setRoleTarget(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              className="w-full rounded border border-wf-border px-3 py-2 text-sm text-wf-black placeholder:text-wf-gray-300 focus:outline-none focus:border-wf-blue transition-colors"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-1">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-wf-gray-700 hover:text-wf-black transition-colors"
          >
            Hủy
          </button>
          <Button onClick={handleSubmit} disabled={!name.trim() || loading} size="sm">
            {loading && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
            Tạo profile
          </Button>
        </div>
      </div>
    </div>
  )
}

// ── Profile Card ────────────────────────────────────────────────────────────

function ProfileCard({
  profile,
  onEdit,
  onDelete,
  onSetDefault,
  onCreateCV,
}: {
  profile: CVProfileListItem
  onEdit: () => void
  onDelete: () => void
  onSetDefault: () => void
  onCreateCV: () => void
}) {
  const [menuOpen, setMenuOpen] = useState(false)

  const updatedAgo = formatDistanceToNow(new Date(profile.updated_at), {
    addSuffix: true,
    locale: vi,
  })

  return (
    <div
      className={cn(
        'group relative flex flex-col rounded-lg border bg-white transition-shadow hover:shadow-wf',
        profile.is_default ? 'border-wf-blue' : 'border-wf-border'
      )}
    >
      {/* Header strip */}
      <div
        className={cn(
          'flex items-center justify-between px-4 pt-4 pb-3',
        )}
      >
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded bg-[rgba(20,110,245,0.08)]">
            <User className="h-4 w-4 text-wf-blue" />
          </div>
          <div className="min-w-0">
            <p className="text-[14px] font-semibold text-wf-black truncate leading-tight">
              {profile.name}
            </p>
            {profile.role_target && (
              <p className="text-xs text-wf-gray-500 truncate mt-0.5">{profile.role_target}</p>
            )}
          </div>
        </div>

        {/* Context menu */}
        <div className="relative" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="flex h-7 w-7 items-center justify-center rounded hover:bg-[rgba(0,0,0,0.05)] transition-colors opacity-0 group-hover:opacity-100"
          >
            <MoreHorizontal className="h-4 w-4 text-wf-gray-700" />
          </button>

          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 top-8 z-20 w-44 rounded-lg border border-wf-border bg-white shadow-wf overflow-hidden py-1">
                <button
                  onClick={() => { setMenuOpen(false); onEdit() }}
                  className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-wf-gray-700 hover:bg-[rgba(20,110,245,0.05)] hover:text-wf-blue"
                >
                  <Pencil className="h-3.5 w-3.5" /> Chỉnh sửa
                </button>
                {!profile.is_default && (
                  <button
                    onClick={() => { setMenuOpen(false); onSetDefault() }}
                    className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-wf-gray-700 hover:bg-[rgba(20,110,245,0.05)] hover:text-wf-blue"
                  >
                    <Star className="h-3.5 w-3.5" /> Đặt làm mặc định
                  </button>
                )}
                <button
                  onClick={() => { setMenuOpen(false); onCreateCV() }}
                  className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-wf-gray-700 hover:bg-[rgba(20,110,245,0.05)] hover:text-wf-blue"
                >
                  <Copy className="h-3.5 w-3.5" /> Tạo CV từ profile
                </button>
                <div className="h-px bg-wf-border my-1" />
                <button
                  onClick={() => { setMenuOpen(false); onDelete() }}
                  className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-wf-red hover:bg-[rgba(238,29,54,0.05)]"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Xóa
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Meta */}
      <div className="px-4 pb-3 space-y-2">
        {profile.full_name && (
          <p className="text-xs text-wf-gray-500">
            <span className="font-medium text-wf-gray-700">{profile.full_name}</span>
            {profile.email && <span className="ml-1">· {profile.email}</span>}
          </p>
        )}
        <div className="flex items-center gap-2">
          {profile.is_default && (
            <Badge className="text-[10px] px-1.5 py-0.5 bg-[rgba(20,110,245,0.1)] text-wf-blue border-0 uppercase tracking-wide">
              Mặc định
            </Badge>
          )}
          {(profile.section_count ?? 0) > 0 && (
            <span className="text-[11px] text-wf-gray-300">
              {profile.section_count} section
            </span>
          )}
        </div>
      </div>

      <div className="mx-4 h-px bg-wf-border" />

      {/* Footer */}
      <div className="flex items-center justify-between px-4 py-3">
        <span className="text-[11px] text-wf-gray-300">{updatedAgo}</span>
        <button
          onClick={onEdit}
          className="text-xs font-medium text-wf-blue hover:underline"
        >
          Chỉnh sửa →
        </button>
      </div>
    </div>
  )
}

// ── Empty State ─────────────────────────────────────────────────────────────

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-wf-border bg-[#fafafa] h-72 space-y-5">
      <div className="flex h-12 w-12 items-center justify-center rounded bg-[rgba(20,110,245,0.08)]">
        <Database className="h-5 w-5 text-wf-blue" />
      </div>
      <div className="text-center space-y-1">
        <p className="text-[15px] font-semibold text-wf-black">Chưa có profile nào</p>
        <p className="text-sm text-wf-gray-500">
          Tạo profile đầu tiên để lưu trữ dữ liệu CV
        </p>
      </div>
      <Button onClick={onCreate} size="sm">
        <Plus className="h-4 w-4 mr-1.5" />
        Tạo profile đầu tiên
      </Button>
    </div>
  )
}

// ── Page ────────────────────────────────────────────────────────────────────

export default function ProfilesPage() {
  const router = useRouter()
  const { profiles, loading, fetchProfiles, createProfile, deleteProfile, setDefault } =
    useProfileStore()
  const [showCreate, setShowCreate] = useState(false)

  useEffect(() => {
    fetchProfiles().catch(() => toast.error('Không thể tải danh sách profile'))
  }, [fetchProfiles])

  const handleCreate = async (name: string, roleTarget: string) => {
    try {
      const profile = await createProfile({ name, role_target: roleTarget || undefined })
      toast.success('Đã tạo profile!')
      router.push(`/profiles/${profile.id}`)
    } catch {
      toast.error('Không thể tạo profile')
      throw new Error('Create failed')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Bạn có chắc muốn xóa profile này? Hành động này không thể hoàn tác.')) return
    try {
      await deleteProfile(id)
      toast.success('Đã xóa profile')
    } catch {
      toast.error('Không thể xóa profile')
    }
  }

  const handleSetDefault = async (id: string) => {
    try {
      await setDefault(id)
      toast.success('Đã đặt làm profile mặc định')
    } catch {
      toast.error('Không thể cập nhật')
    }
  }

  return (
    <div className="p-8 space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <p className="wf-label">Dữ liệu CV</p>
          <h1 className="text-[26px] font-semibold tracking-[-0.03em] text-wf-black leading-tight">
            Profiles của bạn
          </h1>
          <p className="text-sm text-wf-gray-500 mt-1">
            {profiles.length > 0
              ? `${profiles.length} profile · Mỗi profile là một bộ dữ liệu CV riêng biệt`
              : 'Tạo profile để lưu thông tin và tạo nhiều CV từ cùng một nguồn dữ liệu'}
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)} className="gap-2 shrink-0">
          <Plus className="h-4 w-4" />
          Tạo profile
        </Button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-7 w-7 animate-spin text-wf-gray-300" />
        </div>
      ) : profiles.length === 0 ? (
        <EmptyState onCreate={() => setShowCreate(true)} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {profiles.map((profile) => (
            <ProfileCard
              key={profile.id}
              profile={profile}
              onEdit={() => router.push(`/profiles/${profile.id}`)}
              onDelete={() => handleDelete(profile.id)}
              onSetDefault={() => handleSetDefault(profile.id)}
              onCreateCV={() => router.push(`/cv/new?profile_id=${profile.id}`)}
            />
          ))}
        </div>
      )}

      {/* Create Modal */}
      <CreateProfileModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreate={handleCreate}
      />
    </div>
  )
}
