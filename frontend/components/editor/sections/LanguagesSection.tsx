'use client'

import { Plus, Trash2 } from 'lucide-react'

import { useEditorStore } from '@/store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import type { CVSection, LanguagesData, LanguageItem, LanguageLevel } from '@/types'

interface Props { section: CVSection }

const LEVEL_OPTIONS: { value: LanguageLevel; label: string; color: string }[] = [
  { value: 'basic',          label: 'Cơ bản',        color: 'bg-gray-200 text-gray-700' },
  { value: 'conversational', label: 'Giao tiếp',     color: 'bg-blue-100 text-blue-700' },
  { value: 'professional',   label: 'Chuyên nghiệp', color: 'bg-indigo-100 text-indigo-700' },
  { value: 'fluent',         label: 'Thành thạo',    color: 'bg-green-100 text-green-700' },
  { value: 'native',         label: 'Bản ngữ',       color: 'bg-amber-100 text-amber-700' },
]

const emptyItem = (): LanguageItem => ({
  id: crypto.randomUUID(),
  language: '',
  level: 'professional',
})

export function LanguagesSection({ section }: Props) {
  const { updateSection } = useEditorStore()
  const data = section.data as unknown as LanguagesData
  const items: LanguageItem[] = data?.items ?? []

  const save = (updated: LanguageItem[]) =>
    updateSection(section.id, { data: { ...section.data, items: updated } })

  const addItem = () => save([...items, emptyItem()])
  const removeItem = (id: string) => save(items.filter((i) => i.id !== id))
  const patchItem = (id: string, patch: Partial<LanguageItem>) =>
    save(items.map((i) => (i.id === id ? { ...i, ...patch } : i)))

  return (
    <div className="space-y-3">
      {items.length > 0 && (
        <div className="grid grid-cols-[1fr,auto] items-center gap-2 px-1">
          <Label className="text-xs text-muted-foreground">Ngôn ngữ</Label>
          <Label className="text-xs text-muted-foreground">Trình độ</Label>
        </div>
      )}

      {items.map((item) => (
        <div key={item.id} className="flex items-center gap-2">
          <Input
            className="h-8 text-sm flex-1"
            placeholder="Tiếng Anh, Tiếng Nhật..."
            value={item.language}
            onChange={(e) => patchItem(item.id, { language: e.target.value })}
          />
          <div className="flex items-center gap-1 shrink-0">
            {LEVEL_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                title={opt.label}
                onClick={() => patchItem(item.id, { level: opt.value })}
                className={cn(
                  'h-7 rounded px-2 text-[10px] font-medium transition-all border',
                  item.level === opt.value
                    ? `${opt.color} border-current shadow-sm scale-105`
                    : 'bg-transparent border-muted-foreground/20 text-muted-foreground hover:border-muted-foreground/50'
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive shrink-0"
            onClick={() => removeItem(item.id)}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ))}

      <Button variant="outline" size="sm" className="w-full gap-1" onClick={addItem}>
        <Plus className="h-3.5 w-3.5" /> Thêm ngôn ngữ
      </Button>
    </div>
  )
}
