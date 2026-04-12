'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { MoreHorizontal, Pencil, Copy, Trash2 } from 'lucide-react'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'

import { Button } from '@/components/ui/button'
import { CVMiniPreview } from '@/components/cv/CVMiniPreview'
import { formatRelativeTime } from '@/lib/utils'
import type { CVListItem } from '@/types'

interface CVCardProps {
  cv: CVListItem
  onDuplicate: (id: string) => void
  onDelete: (id: string) => void
}

export function CVCard({ cv, onDuplicate, onDelete }: CVCardProps) {
  const router = useRouter()
  const [confirming, setConfirming] = useState(false)

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
        className="h-44 flex items-start justify-center cursor-pointer overflow-hidden bg-white transition-opacity group-hover:opacity-90"
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
      <div className="p-3 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-medium truncate">{cv.title}</p>
          <p className="text-xs text-muted-foreground">{formatRelativeTime(cv.updated_at)}</p>
        </div>

        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" aria-label="More options">
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
