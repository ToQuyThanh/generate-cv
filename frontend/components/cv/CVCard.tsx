'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { MoreHorizontal, Pencil, Copy, Trash2, Check, X } from 'lucide-react'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { CVMiniPreview } from '@/components/cv/CVMiniPreview'
import { formatRelativeTime } from '@/lib/utils'
import { cvApi } from '@/lib/api'
import type { CVListItem } from '@/types'

interface CVCardProps {
  cv: CVListItem
  onDuplicate: (id: string) => void
  onDelete: (id: string) => void
  onRename?: (id: string, newTitle: string) => void
}

export function CVCard({ cv, onDuplicate, onDelete, onRename }: CVCardProps) {
  const router = useRouter()
  const [confirming, setConfirming] = useState(false)
  const [editing, setEditing] = useState(false)
  const [title, setTitle] = useState(cv.title)
  const [saving, setSaving] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const startEditing = () => {
    setEditing(true)
    setTitle(cv.title)
    setTimeout(() => {
      inputRef.current?.focus()
      inputRef.current?.select()
    }, 0)
  }

  const cancelEditing = () => {
    setEditing(false)
    setTitle(cv.title)
  }

  const saveTitle = async () => {
    const trimmed = title.trim()
    if (!trimmed || trimmed === cv.title) {
      cancelEditing()
      return
    }
    setSaving(true)
    try {
      await cvApi.update(cv.id, { title: trimmed })
      onRename?.(cv.id, trimmed)
      toast.success('Đã đổi tên CV')
    } catch {
      toast.error('Không thể đổi tên CV')
      setTitle(cv.title)
    } finally {
      setSaving(false)
      setEditing(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') saveTitle()
    if (e.key === 'Escape') cancelEditing()
  }

  const handleDelete = () => {
    if (!confirming) {
      setConfirming(true)
      setTimeout(() => setConfirming(false), 3000)
      return
    }
    onDelete(cv.id)
  }

  return (
    <div className="group relative rounded-xl border bg-card shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden">
      {/* Thumbnail preview */}
      <div
        className="h-48 flex items-start justify-center cursor-pointer overflow-hidden bg-white transition-opacity group-hover:opacity-90"
        onClick={() => router.push(`/cv/${cv.id}`)}
        role="button"
        tabIndex={0}
        aria-label={`Mở CV ${cv.title}`}
        onKeyDown={(e) => e.key === 'Enter' && router.push(`/cv/${cv.id}`)}
      >
        <CVMiniPreview
          sections={cv.sections ?? []}
          colorTheme={cv.color_theme}
          containerWidth={280}
        />
      </div>

      {/* Footer */}
      <div className="p-3 flex items-center justify-between gap-2 border-t">
        <div className="min-w-0 flex-1">
          {editing ? (
            /* Inline rename input */
            <div className="flex items-center gap-1">
              <input
                ref={inputRef}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onKeyDown={handleKeyDown}
                onBlur={saveTitle}
                disabled={saving}
                className="w-full text-sm font-medium bg-transparent border-b border-primary outline-none px-0 py-0.5 truncate"
                maxLength={80}
              />
              <button
                onMouseDown={(e) => { e.preventDefault(); saveTitle() }}
                className="shrink-0 text-primary hover:text-primary/80"
                aria-label="Lưu tên"
              >
                <Check className="h-3.5 w-3.5" />
              </button>
              <button
                onMouseDown={(e) => { e.preventDefault(); cancelEditing() }}
                className="shrink-0 text-muted-foreground hover:text-foreground"
                aria-label="Huỷ"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            /* Tên CV — double-click để đổi tên */
            <p
              className="text-sm font-medium truncate cursor-pointer hover:text-primary transition-colors"
              onDoubleClick={startEditing}
              title="Nhấn đúp để đổi tên"
            >
              {cv.title}
            </p>
          )}
          <p className="text-xs text-muted-foreground mt-0.5">{formatRelativeTime(cv.updated_at)}</p>
        </div>

        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" aria-label="Tuỳ chọn">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content
              className="z-50 min-w-36 rounded-lg border bg-popover p-1 shadow-md animate-fade-in"
              align="end"
              sideOffset={4}
            >
              <DropdownMenu.Item
                className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm cursor-pointer hover:bg-accent outline-none"
                onClick={() => router.push(`/cv/${cv.id}`)}
              >
                <Pencil className="h-3.5 w-3.5" /> Chỉnh sửa
              </DropdownMenu.Item>
              <DropdownMenu.Item
                className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm cursor-pointer hover:bg-accent outline-none"
                onClick={startEditing}
              >
                <Pencil className="h-3.5 w-3.5" /> Đổi tên
              </DropdownMenu.Item>
              <DropdownMenu.Item
                className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm cursor-pointer hover:bg-accent outline-none"
                onClick={() => onDuplicate(cv.id)}
              >
                <Copy className="h-3.5 w-3.5" /> Nhân đôi
              </DropdownMenu.Item>
              <DropdownMenu.Separator className="my-1 h-px bg-border" />
              <DropdownMenu.Item
                className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm cursor-pointer hover:bg-destructive/10 text-destructive outline-none"
                onClick={handleDelete}
              >
                <Trash2 className="h-3.5 w-3.5" />
                {confirming ? 'Nhấn lại để xác nhận' : 'Xóa'}
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </div>
    </div>
  )
}
