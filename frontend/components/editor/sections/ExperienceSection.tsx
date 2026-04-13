'use client'

import { useState } from 'react'
import { Plus, Trash2, Sparkles, Loader2, ChevronDown, ChevronUp, X } from 'lucide-react'
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
  location: '',
  start_date: '',
  end_date: '',
  is_current: false,
  description: '',
  achievements: [],
  tech_stack: [],
})

export function ExperienceSection({ section }: Props) {
  const { updateSection, cvData } = useEditorStore()
  const { subscription } = useAuthStore()
  const data = section.data as ExperienceData
  const items: ExperienceItem[] = data?.items ?? []
  const [expandedId, setExpandedId] = useState<string | null>(items[0]?.id ?? null)
  const [suggestingId, setSuggestingId] = useState<string | null>(null)
  const [tagInputs, setTagInputs] = useState<Record<string, string>>({})
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

  // ── Tag helpers ──────────────────────────────────────────────────────────

  const addTag = (itemId: string, field: 'tech_stack' | 'achievements', value: string) => {
    const trimmed = value.trim()
    if (!trimmed) return
    const item = items.find((i) => i.id === itemId)
    if (!item) return
    const existing = (item[field] ?? []) as string[]
    if (existing.includes(trimmed)) return
    patchItem(itemId, { [field]: [...existing, trimmed] })
    setTagInputs((prev) => ({ ...prev, [`${itemId}-${field}`]: '' }))
  }

  const removeTag = (itemId: string, field: 'tech_stack' | 'achievements', tag: string) => {
    const item = items.find((i) => i.id === itemId)
    if (!item) return
    const existing = (item[field] ?? []) as string[]
    patchItem(itemId, { [field]: existing.filter((t) => t !== tag) })
  }

  const handleTagKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    itemId: string,
    field: 'tech_stack' | 'achievements'
  ) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addTag(itemId, field, tagInputs[`${itemId}-${field}`] ?? '')
    }
  }

  // ── AI ───────────────────────────────────────────────────────────────────

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
              {item.location && (
                <p className="text-xs text-muted-foreground truncate">{item.location}</p>
              )}
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
            <div className="p-3 space-y-3">
              {/* Row 1: company + position */}
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
              </div>

              {/* Row 2: location */}
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Địa điểm (tùy chọn)</Label>
                <Input className="h-8 text-sm" placeholder="Hà Nội / Remote / TP.HCM"
                  value={item.location ?? ''}
                  onChange={(e) => patchItem(item.id, { location: e.target.value })} />
              </div>

              {/* Row 3: dates */}
              <div className="grid grid-cols-2 gap-2">
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

              {/* Description */}
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
                  placeholder="Mô tả trách nhiệm, phạm vi công việc..."
                  value={item.description}
                  onChange={(e) => patchItem(item.id, { description: e.target.value })}
                />
              </div>

              {/* Achievements */}
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">
                  Thành tích nổi bật (mỗi dòng 1 thành tích)
                </Label>
                {(item.achievements ?? []).length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-1">
                    {(item.achievements ?? []).map((ach, idx) => (
                      <span key={idx}
                        className="inline-flex items-center gap-1 rounded bg-green-50 border border-green-200 px-2 py-0.5 text-xs text-green-800">
                        {ach}
                        <button onClick={() => removeTag(item.id, 'achievements', ach)}
                          className="hover:text-red-500 transition-colors">
                          <X className="h-2.5 w-2.5" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                <Input
                  className="h-8 text-sm"
                  placeholder="Tăng 30% hiệu suất API... (Enter để thêm)"
                  value={tagInputs[`${item.id}-achievements`] ?? ''}
                  onChange={(e) => setTagInputs((p) => ({ ...p, [`${item.id}-achievements`]: e.target.value }))}
                  onKeyDown={(e) => handleTagKeyDown(e, item.id, 'achievements')}
                  onBlur={() => addTag(item.id, 'achievements', tagInputs[`${item.id}-achievements`] ?? '')}
                />
              </div>

              {/* Tech stack */}
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">
                  Công nghệ sử dụng (Enter hoặc dấu phẩy để thêm)
                </Label>
                {(item.tech_stack ?? []).length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-1">
                    {(item.tech_stack ?? []).map((tech) => (
                      <span key={tech}
                        className="inline-flex items-center gap-1 rounded bg-blue-50 border border-blue-200 px-2 py-0.5 text-xs text-blue-800">
                        {tech}
                        <button onClick={() => removeTag(item.id, 'tech_stack', tech)}
                          className="hover:text-red-500 transition-colors">
                          <X className="h-2.5 w-2.5" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                <Input
                  className="h-8 text-sm"
                  placeholder="Go, PostgreSQL, Docker... (Enter để thêm)"
                  value={tagInputs[`${item.id}-tech_stack`] ?? ''}
                  onChange={(e) => setTagInputs((p) => ({ ...p, [`${item.id}-tech_stack`]: e.target.value }))}
                  onKeyDown={(e) => handleTagKeyDown(e, item.id, 'tech_stack')}
                  onBlur={() => addTag(item.id, 'tech_stack', tagInputs[`${item.id}-tech_stack`] ?? '')}
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
