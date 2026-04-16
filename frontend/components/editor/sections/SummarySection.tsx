'use client'

import { useState } from 'react'
import { Sparkles, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

import { useEditorStore, useAuthStore } from '@/store'
import { aiApi } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import type { CVSection, SummaryData } from '@/types'

interface Props { section: CVSection }

export function SummarySection({ section }: Props) {
  const { updateSection, cvData } = useEditorStore()
  const { subscription, isHydrated } = useAuthStore()
  const data = (section.data as Partial<SummaryData>) ?? {}
  const [suggesting, setSuggesting] = useState(false)

  // isPaid: chỉ true khi đã hydrate XNG và subscription tồn tại với plan paid + status active
  const isPaid =
    isHydrated &&
    subscription !== null &&
    subscription.plan !== 'free' &&
    subscription.status === 'active'

  const handleAISuggest = async () => {
    if (!isHydrated) return // chưa hydrate xong, không làm gì cả

    if (!isPaid) {
      toast.info('Nâng cấp gói để dùng AI gợi ý')
      return
    }
    if (!cvData) return

    setSuggesting(true)
    try {
      const res = await aiApi.suggestSummary({ cv_id: cvData.id })
      updateSection(section.id, { data: { ...section.data, content: res.suggestion } })
      toast.success('Đã áp dụng gợi ý AI')
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status
      if (status === 401) {
        toast.error('Phiên làm việc hết hạn, vui lòng đăng nhập lại')
      } else if (status === 403) {
        toast.error('Cần nâng cấp gói để dùng tính năng này')
      } else {
        toast.error('AI gặp lỗi, thử lại sau')
      }
    } finally {
      setSuggesting(false)
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-xs text-muted-foreground">Giới thiệu bản thân</Label>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 gap-1 text-xs text-primary px-2"
          onClick={handleAISuggest}
          disabled={suggesting || !isHydrated}
        >
          {suggesting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
          Gợi ý AI
        </Button>
      </div>
      <textarea
        className="w-full min-h-[120px] resize-none rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary"
        placeholder="Viết vài dòng giới thiệu về bản thân, kinh nghiệm và mục tiêu nghề nghiệp..."
        value={(data.content as string) ?? ''}
        onChange={(e) =>
          updateSection(section.id, { data: { ...section.data, content: e.target.value } })
        }
      />
    </div>
  )
}
