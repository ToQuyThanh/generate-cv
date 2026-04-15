'use client'

import { useState } from 'react'
import { Plus, Trash2, ChevronDown, ChevronUp, X } from 'lucide-react'

import { useEditorStore } from '@/store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { CVSection, ProjectsData, ProjectItem } from '@/types'

interface Props { section: CVSection }

const emptyItem = (): ProjectItem => ({
  id: crypto.randomUUID(),
  name: '',
  role: '',
  url: '',
  start_date: '',
  end_date: '',
  description: '',
  tech_stack: [],
  highlights: [],
})

export function ProjectsSection({ section }: Props) {
  const { updateSection } = useEditorStore()
  const data = section.data as unknown as ProjectsData
  const items: ProjectItem[] = data?.items ?? []
  const [expandedId, setExpandedId] = useState<string | null>(items[0]?.id ?? null)
  const [tagInputs, setTagInputs] = useState<Record<string, string>>({})

  const save = (updated: ProjectItem[]) =>
    updateSection(section.id, { data: { ...section.data, items: updated } })

  const addItem = () => {
    const item = emptyItem()
    save([...items, item])
    setExpandedId(item.id)
  }

  const removeItem = (id: string) => save(items.filter((i) => i.id !== id))

  const patchItem = (id: string, patch: Partial<ProjectItem>) =>
    save(items.map((i) => (i.id === id ? { ...i, ...patch } : i)))

  const addTag = (itemId: string, field: 'tech_stack' | 'highlights', value: string) => {
    const trimmed = value.trim()
    if (!trimmed) return
    const item = items.find((i) => i.id === itemId)
    if (!item) return
    const existing = (item[field] ?? []) as string[]
    if (existing.includes(trimmed)) return
    patchItem(itemId, { [field]: [...existing, trimmed] })
    setTagInputs((prev) => ({ ...prev, [`${itemId}-${field}`]: '' }))
  }

  const removeTag = (itemId: string, field: 'tech_stack' | 'highlights', tag: string) => {
    const item = items.find((i) => i.id === itemId)
    if (!item) return
    patchItem(itemId, { [field]: ((item[field] ?? []) as string[]).filter((t) => t !== tag) })
  }

  const handleTagKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    itemId: string,
    field: 'tech_stack' | 'highlights'
  ) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addTag(itemId, field, tagInputs[`${itemId}-${field}`] ?? '')
    }
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div key={item.id} className="rounded-lg border overflow-hidden">
          <div
            className="flex items-center justify-between px-3 py-2 bg-muted/30 cursor-pointer"
            onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
          >
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">
                {item.name || 'Dự án mới'}{item.role ? ` — ${item.role}` : ''}
              </p>
              {item.url && (
                <p className="text-xs text-muted-foreground truncate">{item.url}</p>
              )}
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive"
                onClick={(e) => { e.stopPropagation(); removeItem(item.id) }}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
              {expandedId === item.id
                ? <ChevronUp className="h-4 w-4 text-muted-foreground" />
                : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
            </div>
          </div>

          {expandedId === item.id && (
            <div className="p-3 space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Tên dự án</Label>
                  <Input className="h-8 text-sm" placeholder="E-Commerce Platform"
                    value={item.name}
                    onChange={(e) => patchItem(item.id, { name: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Vai trò (tùy chọn)</Label>
                  <Input className="h-8 text-sm" placeholder="Lead Developer"
                    value={item.role ?? ''}
                    onChange={(e) => patchItem(item.id, { role: e.target.value })} />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Link dự án (tùy chọn)</Label>
                <Input className="h-8 text-sm" placeholder="https://github.com/you/project"
                  value={item.url ?? ''}
                  onChange={(e) => patchItem(item.id, { url: e.target.value })} />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Từ tháng</Label>
                  <Input className="h-8 text-sm" type="month" value={item.start_date ?? ''}
                    onChange={(e) => patchItem(item.id, { start_date: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Đến tháng</Label>
                  <Input className="h-8 text-sm" type="month" value={item.end_date ?? ''}
                    onChange={(e) => patchItem(item.id, { end_date: e.target.value })} />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Mô tả dự án</Label>
                <textarea
                  className="w-full min-h-[80px] resize-none rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary"
                  placeholder="Mô tả tổng quan dự án, bài toán giải quyết..."
                  value={item.description}
                  onChange={(e) => patchItem(item.id, { description: e.target.value })}
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">
                  Điểm nổi bật (Enter để thêm)
                </Label>
                {(item.highlights ?? []).length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-1">
                    {(item.highlights ?? []).map((hl, idx) => (
                      <span key={idx}
                        className="inline-flex items-center gap-1 rounded bg-green-50 border border-green-200 px-2 py-0.5 text-xs text-green-800">
                        {hl}
                        <button onClick={() => removeTag(item.id, 'highlights', hl)}
                          className="hover:text-red-500 transition-colors">
                          <X className="h-2.5 w-2.5" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                <Input className="h-8 text-sm"
                  placeholder="Xử lý 1M request/ngày... (Enter để thêm)"
                  value={tagInputs[`${item.id}-highlights`] ?? ''}
                  onChange={(e) => setTagInputs((p) => ({ ...p, [`${item.id}-highlights`]: e.target.value }))}
                  onKeyDown={(e) => handleTagKeyDown(e, item.id, 'highlights')}
                  onBlur={() => addTag(item.id, 'highlights', tagInputs[`${item.id}-highlights`] ?? '')}
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">
                  Công nghệ (Enter hoặc dấu phẩy để thêm)
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
                <Input className="h-8 text-sm"
                  placeholder="React, Node.js, AWS... (Enter để thêm)"
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
        <Plus className="h-3.5 w-3.5" /> Thêm dự án
      </Button>
    </div>
  )
}
