'use client'

import { useState } from 'react'
import { Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react'

import { useEditorStore } from '@/store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { CVSection, EducationData, EducationItem } from '@/types'

interface Props { section: CVSection }

const emptyItem = (): EducationItem => ({
  id: crypto.randomUUID(),
  school: '',
  degree: '',
  field: '',
  start_date: '',
  end_date: '',
  gpa: '',
  description: '',
})

export function EducationSection({ section }: Props) {
  const { updateSection } = useEditorStore()
  const data = section.data as EducationData
  const items: EducationItem[] = data?.items ?? []
  const [expandedId, setExpandedId] = useState<string | null>(items[0]?.id ?? null)

  const save = (updated: EducationItem[]) =>
    updateSection(section.id, { data: { ...section.data, items: updated } })

  const addItem = () => {
    const item = emptyItem()
    save([...items, item])
    setExpandedId(item.id)
  }

  const removeItem = (id: string) => save(items.filter((i) => i.id !== id))

  const patchItem = (id: string, patch: Partial<EducationItem>) =>
    save(items.map((i) => (i.id === id ? { ...i, ...patch } : i)))

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div key={item.id} className="rounded-lg border overflow-hidden">
          <div
            className="flex items-center justify-between px-3 py-2 bg-muted/30 cursor-pointer"
            onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
          >
            <p className="text-sm font-medium truncate">
              {item.school || 'Trường mới'}{item.degree ? ` — ${item.degree}` : ''}
            </p>
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
            <div className="p-3 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div className="col-span-2 space-y-1">
                  <Label className="text-xs text-muted-foreground">Tên trường</Label>
                  <Input className="h-8 text-sm" value={item.school}
                    onChange={(e) => patchItem(item.id, { school: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Bằng cấp</Label>
                  <Input className="h-8 text-sm" placeholder="Cử nhân, Thạc sĩ..."
                    value={item.degree}
                    onChange={(e) => patchItem(item.id, { degree: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Chuyên ngành</Label>
                  <Input className="h-8 text-sm" value={item.field}
                    onChange={(e) => patchItem(item.id, { field: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Từ năm</Label>
                  <Input className="h-8 text-sm" type="month" value={item.start_date}
                    onChange={(e) => patchItem(item.id, { start_date: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Đến năm</Label>
                  <Input className="h-8 text-sm" type="month" value={item.end_date}
                    onChange={(e) => patchItem(item.id, { end_date: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">GPA (tùy chọn)</Label>
                  <Input className="h-8 text-sm" placeholder="3.8 / 4.0" value={item.gpa ?? ''}
                    onChange={(e) => patchItem(item.id, { gpa: e.target.value })} />
                </div>
              </div>
            </div>
          )}
        </div>
      ))}

      <Button variant="outline" size="sm" className="w-full gap-1" onClick={addItem}>
        <Plus className="h-3.5 w-3.5" /> Thêm học vấn
      </Button>
    </div>
  )
}
