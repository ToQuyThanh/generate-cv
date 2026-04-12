'use client'

import { useState } from 'react'
import { Plus, Trash2, Sparkles, Loader2, ChevronDown, ChevronUp } from 'lucide-react'
import { toast } from 'sonner'

import { useEditorStore, useAuthStore } from '@/store'
import { aiApi } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { CVSection, ExperienceData, ExperienceItem } from '@/types'

interface Props { section: CVSection }

const emptyItem = (): ExperienceItem => ({
  id: crypto.randomUUID(),
  company: '',
  position: '',
  start_date: '',
  end_date: '',
  is_current: false,
  description: '',
})

export function ExperienceSection({ section }: Props) {
  const { updateSection, cvData } = useEditorStore()
  const { subscription } = useAuthStore()
  const data = section.data as ExperienceData
  const items: ExperienceItem[] = data?.items ?? []
  const [expandedId, setExpandedId] = useState<string | null>(items[0]?.id ?? null)
  const [suggestingId, setSuggestingId] = useState<string | null>(null)
  const isPaid = subscription?.plan !== 'free'

  const save = (updated: ExperienceItem[]) =>
    updateSection(section.id, { data: { ...section.data, items: updated } })

  const addItem = () => {
    const item = emptyItem()
    save([...items, item])
    setExpandedId(item.id)
  }

  const removeItem = (id: string) => save(items.filter((i) => i.id !== id))

  const patchItem = (id: string, patch: Partial<ExperienceItem>) =>
    save(items.map((i) => (i.id === id ? { ...i, ...patch } : i)))

  const handleAISuggest = async (item: ExperienceItem) => {
    if (!isPaid) { toast.info('Nâng cấp gói để dùng AI'); return }
    if (!cvData) return
    setSuggestingId(item.id)
    try {
      const res = await aiApi.suggestExperience({
        cv_id: cvData.id,
        company: item.company,
        position: item.position,
        current_description: item.description,
      })
      patchItem(item.id, { description: res.suggestion })
      toast.success('Đã áp dụng gợi ý AI')
    } catch {
      toast.error('AI gặp lỗi, thử lại sau')
    } finally {
      setSuggestingId(null)
    }
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div key={item.id} className="rounded-lg border overflow-hidden">
          {/* Item header */}
          <div
            className="flex items-center justify-between px-3 py-2 bg-muted/30 cursor-pointer"
            onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
          >
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">
                {item.position || 'Vị trí mới'}{item.company ? ` — ${item.company}` : ''}
              </p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <Button
                variant="ghost" size="icon" className="h-6 w-6 text-destructive"
                onClick={(e) => { e.stopPropagation(); removeItem(item.id) }}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
              {expandedId === item.id
                ? <ChevronUp className="h-4 w-4 text-muted-foreground" />
                : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
            </div>
          </div>

          {expandedId === item.id && (
            <div className="p-3 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Công ty</Label>
                  <Input className="h-8 text-sm" value={item.company}
                    onChange={(e) => patchItem(item.id, { company: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Vị trí</Label>
                  <Input className="h-8 text-sm" value={item.position}
                    onChange={(e) => patchItem(item.id, { position: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Từ tháng</Label>
                  <Input className="h-8 text-sm" type="month" value={item.start_date}
                    onChange={(e) => patchItem(item.id, { start_date: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Đến tháng</Label>
                  <Input className="h-8 text-sm" type="month" value={item.end_date}
                    disabled={item.is_current}
                    onChange={(e) => patchItem(item.id, { end_date: e.target.value })} />
                </div>
              </div>
              <label className="flex items-center gap-2 text-xs cursor-pointer">
                <input type="checkbox" checked={item.is_current}
                  onChange={(e) => patchItem(item.id, { is_current: e.target.checked, end_date: '' })} />
                Hiện đang làm việc tại đây
              </label>
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-muted-foreground">Mô tả công việc</Label>
                  <Button variant="ghost" size="sm" className="h-5 gap-1 text-xs text-primary px-2"
                    onClick={() => handleAISuggest(item)} disabled={!!suggestingId}>
                    {suggestingId === item.id
                      ? <Loader2 className="h-3 w-3 animate-spin" />
                      : <Sparkles className="h-3 w-3" />}
                    Gợi ý AI
                  </Button>
                </div>
                <textarea
                  className="w-full min-h-[80px] resize-none rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary"
                  placeholder="Mô tả công việc, thành tích, công nghệ sử dụng..."
                  value={item.description}
                  onChange={(e) => patchItem(item.id, { description: e.target.value })}
                />
              </div>
            </div>
          )}
        </div>
      ))}

      <Button variant="outline" size="sm" className="w-full gap-1" onClick={addItem}>
        <Plus className="h-3.5 w-3.5" /> Thêm kinh nghiệm
      </Button>
    </div>
  )
}
