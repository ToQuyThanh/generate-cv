'use client'

import { Plus, Trash2, X } from 'lucide-react'
import { useEditorStore } from '@/store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { CVSection } from '@/types'

interface CustomItem {
  id: string
  text: string
}

interface CustomData {
  items: CustomItem[]
}

interface Props { section: CVSection }

export function CustomSection({ section }: Props) {
  const { updateSection, removeSection } = useEditorStore()
  const data = section.data as Partial<CustomData>
  const items: CustomItem[] = data.items ?? []

  const save = (updated: CustomItem[]) =>
    updateSection(section.id, { data: { items: updated } })

  const addItem = () =>
    save([...items, { id: crypto.randomUUID(), text: '' }])

  const patchItem = (id: string, text: string) =>
    save(items.map((i) => (i.id === id ? { ...i, text } : i)))

  const removeItem = (id: string) =>
    save(items.filter((i) => i.id !== id))

  return (
    <div className="space-y-3">
      {/* Section title editable */}
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">Tên section</Label>
        <Input
          className="h-8 text-sm font-medium"
          value={section.title}
          placeholder="Giải thưởng, Hoạt động, Sở thích..."
          onChange={(e) => updateSection(section.id, { title: e.target.value })}
        />
      </div>

      {/* Items */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Nội dung</Label>
        {items.map((item) => (
          <div key={item.id} className="flex items-center gap-2">
            <span className="text-muted-foreground text-sm shrink-0">•</span>
            <Input
              className="h-8 text-sm flex-1"
              value={item.text}
              placeholder="Nhập nội dung..."
              onChange={(e) => patchItem(item.id, e.target.value)}
            />
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-destructive shrink-0"
              onClick={() => removeItem(item.id)}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        ))}
        <Button variant="outline" size="sm" className="w-full gap-1" onClick={addItem}>
          <Plus className="h-3.5 w-3.5" /> Thêm dòng
        </Button>
      </div>

      {/* Delete section */}
      <div className="pt-2 border-t">
        <Button
          variant="ghost"
          size="sm"
          className="w-full gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10 text-xs"
          onClick={() => removeSection(section.id)}
        >
          <Trash2 className="h-3.5 w-3.5" />
          Xóa section này
        </Button>
      </div>
    </div>
  )
}
