/**
 * cv-template.ts
 *
 * Blank template — bộ sections mặc định khi tạo CV mới.
 * Mỗi section có đủ type / title / visible / order / data rỗng
 * để EditorPanel có thể render ngay mà không cần backend trả sections.
 */

import type { CVSection, SectionType } from '@/types'

interface SectionMeta {
  type: SectionType
  title: string
  order: number
  data: Record<string, unknown>
}

const BLANK_SECTIONS_META: SectionMeta[] = [
  {
    type: 'personal',
    title: 'Thông tin cá nhân',
    order: 0,
    data: {
      full_name: '',
      job_title: '',
      email: '',
      phone: '',
      location: '',
      website: '',
      linkedin: '',
      github: '',
      avatar_url: '',
    },
  },
  {
    type: 'summary',
    title: 'Giới thiệu bản thân',
    order: 1,
    data: { content: '' },
  },
  {
    type: 'experience',
    title: 'Kinh nghiệm làm việc',
    order: 2,
    data: { items: [] },
  },
  {
    type: 'education',
    title: 'Học vấn',
    order: 3,
    data: { items: [] },
  },
  {
    type: 'skills',
    title: 'Kỹ năng',
    order: 4,
    data: { items: [] },
  },
]

/**
 * Trả về mảng CVSection blank cho CV mới.
 * ID được sinh bằng crypto.randomUUID() — stable trong browser & Node 18+.
 */
export function getBlankSections(): CVSection[] {
  return BLANK_SECTIONS_META.map((meta) => ({
    id: crypto.randomUUID(),
    type: meta.type,
    title: meta.title,
    visible: true,
    order: meta.order,
    data: { ...meta.data },
  }))
}
