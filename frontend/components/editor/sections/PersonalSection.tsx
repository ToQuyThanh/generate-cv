'use client'

import { useEditorStore } from '@/store'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { CVSection, PersonalData } from '@/types'

interface Props { section: CVSection }

export function PersonalSection({ section }: Props) {
  const { updateSection } = useEditorStore()
  const data = (section.data as Partial<PersonalData>) ?? {}

  const set = (field: keyof PersonalData, value: string) =>
    updateSection(section.id, { data: { ...section.data, [field]: value } })

  const fields: { key: keyof PersonalData; label: string; placeholder?: string }[] = [
    { key: 'full_name',  label: 'Họ và tên',        placeholder: 'Nguyễn Văn A' },
    { key: 'job_title',  label: 'Vị trí ứng tuyển', placeholder: 'Frontend Developer' },
    { key: 'email',      label: 'Email',             placeholder: 'email@example.com' },
    { key: 'phone',      label: 'Số điện thoại',     placeholder: '0912 345 678' },
    { key: 'location',   label: 'Địa chỉ',           placeholder: 'Hà Nội, Việt Nam' },
    { key: 'website',    label: 'Website',            placeholder: 'https://yoursite.com' },
    { key: 'linkedin',   label: 'LinkedIn',           placeholder: 'linkedin.com/in/yourname' },
    { key: 'github',     label: 'GitHub',             placeholder: 'github.com/yourname' },
  ]

  return (
    <div className="space-y-3">
      {fields.map(({ key, label, placeholder }) => (
        <div key={key} className="space-y-1">
          <Label className="text-xs text-muted-foreground">{label}</Label>
          <Input
            value={(data[key] as string) ?? ''}
            placeholder={placeholder}
            onChange={(e) => set(key, e.target.value)}
            className="h-8 text-sm"
          />
        </div>
      ))}
    </div>
  )
}
