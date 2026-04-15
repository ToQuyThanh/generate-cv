'use client'

import { Plus, Trash2 } from 'lucide-react'

import { useEditorStore } from '@/store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import type { CVSection, SkillsData, SkillItem } from '@/types'

interface Props { section: CVSection }

const LEVELS = [1, 2, 3, 4, 5] as const
const LEVEL_LABELS = ['Cơ bản', 'Trung cấp', 'Khá', 'Giỏi', 'Chuyên gia']

const emptySkill = (): SkillItem => ({
  id: crypto.randomUUID(),
  name: '',
  level: 3,
})

export function SkillsSection({ section }: Props) {
  const { updateSection } = useEditorStore()
  const data = section.data as unknown as SkillsData
  const items: SkillItem[] = data?.items ?? []

  const save = (updated: SkillItem[]) =>
    updateSection(section.id, { data: { ...section.data, items: updated } })

  const addItem = () => save([...items, emptySkill()])
  const removeItem = (id: string) => save(items.filter((i) => i.id !== id))
  const patchItem = (id: string, patch: Partial<SkillItem>) =>
    save(items.map((i) => (i.id === id ? { ...i, ...patch } : i)))

  return (
    <div className="space-y-2">
      {items.map((item) => (
        <div key={item.id} className="flex items-center gap-2">
          <Input
            className="h-8 text-sm flex-1"
            placeholder="Tên kỹ năng (React, Python...)"
            value={item.name}
            onChange={(e) => patchItem(item.id, { name: e.target.value })}
          />
          <div className="flex items-center gap-1 shrink-0">
            {LEVELS.map((lvl) => (
              <button
                key={lvl}
                title={LEVEL_LABELS[lvl - 1]}
                onClick={() => patchItem(item.id, { level: lvl })}
                className={cn(
                  'h-3.5 w-3.5 rounded-full border transition-colors',
                  item.level >= lvl
                    ? 'bg-primary border-primary'
                    : 'bg-transparent border-muted-foreground/30'
                )}
              />
            ))}
          </div>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive shrink-0"
            onClick={() => removeItem(item.id)}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ))}
      <Button variant="outline" size="sm" className="w-full gap-1" onClick={addItem}>
        <Plus className="h-3.5 w-3.5" /> Thêm kỹ năng
      </Button>
    </div>
  )
}
