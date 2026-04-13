'use client'

import { useState } from 'react'
import { Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react'

import { useEditorStore } from '@/store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { CVSection, CertificationsData, CertificationItem } from '@/types'

interface Props { section: CVSection }

const emptyItem = (): CertificationItem => ({
  id: crypto.randomUUID(),
  name: '',
  issuer: '',
  date: '',
  url: '',
  credential_id: '',
})

export function CertificationsSection({ section }: Props) {
  const { updateSection } = useEditorStore()
  const data = section.data as CertificationsData
  const items: CertificationItem[] = data?.items ?? []
  const [expandedId, setExpandedId] = useState<string | null>(items[0]?.id ?? null)

  const save = (updated: CertificationItem[]) =>
    updateSection(section.id, { data: { ...section.data, items: updated } })

  const addItem = () => {
    const item = emptyItem()
    save([...items, item])
    setExpandedId(item.id)
  }

  const removeItem = (id: string) => save(items.filter((i) => i.id !== id))

  const patchItem = (id: string, patch: Partial<CertificationItem>) =>
    save(items.map((i) => (i.id === id ? { ...i, ...patch } : i)))

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
                {item.name || 'Chứng chỉ mới'}{item.issuer ? ` — ${item.issuer}` : ''}
              </p>
              {item.date && (
                <p className="text-xs text-muted-foreground">{item.date}</p>
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
            <div className="p-3 space-y-2">
              {/* Name + issuer */}
              <div className="grid grid-cols-2 gap-2">
                <div className="col-span-2 space-y-1">
                  <Label className="text-xs text-muted-foreground">Tên chứng chỉ</Label>
                  <Input className="h-8 text-sm" placeholder="AWS Solutions Architect"
                    value={item.name}
                    onChange={(e) => patchItem(item.id, { name: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Tổ chức cấp</Label>
                  <Input className="h-8 text-sm" placeholder="Amazon Web Services"
                    value={item.issuer}
                    onChange={(e) => patchItem(item.id, { issuer: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Ngày cấp</Label>
                  <Input className="h-8 text-sm" type="month" value={item.date}
                    onChange={(e) => patchItem(item.id, { date: e.target.value })} />
                </div>
              </div>

              {/* URL */}
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Link xác minh (tùy chọn)</Label>
                <Input className="h-8 text-sm" placeholder="https://verify.example.com/cert/..."
                  value={item.url ?? ''}
                  onChange={(e) => patchItem(item.id, { url: e.target.value })} />
              </div>

              {/* Credential ID */}
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Mã chứng chỉ (tùy chọn)</Label>
                <Input className="h-8 text-sm" placeholder="ABC-12345"
                  value={item.credential_id ?? ''}
                  onChange={(e) => patchItem(item.id, { credential_id: e.target.value })} />
              </div>
            </div>
          )}
        </div>
      ))}

      <Button variant="outline" size="sm" className="w-full gap-1" onClick={addItem}>
        <Plus className="h-3.5 w-3.5" /> Thêm chứng chỉ
      </Button>
    </div>
  )
}
