'use client'

import { useEditorStore } from '@/store'
import type {
  PersonalData,
  SummaryData,
  ExperienceData,
  EducationData,
  SkillsData,
  CVSection,
} from '@/types'

export function CVPreview() {
  const { cvData } = useEditorStore()
  if (!cvData) return null

  const { sections, color_theme } = cvData
  const sorted = [...sections].sort((a, b) => a.order - b.order).filter((s) => s.visible)

  const personal = sorted.find((s) => s.type === 'personal')?.data as Partial<PersonalData> | undefined
  const otherSections = sorted.filter((s) => s.type !== 'personal')

  return (
    <div
      className="w-[595px] min-h-[841px] bg-white shadow-xl rounded text-[11px] leading-relaxed overflow-hidden"
      style={{ fontFamily: 'Inter, sans-serif' }}
    >
      {/* Header block */}
      <div className="px-8 py-6" style={{ backgroundColor: color_theme }}>
        <h1 className="text-2xl font-bold text-white leading-tight">
          {personal?.full_name || 'Họ và Tên'}
        </h1>
        {personal?.job_title && (
          <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.85)' }}>
            {personal.job_title}
          </p>
        )}
        {/* Contact row */}
        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3" style={{ color: 'rgba(255,255,255,0.8)' }}>
          {personal?.email && <span>✉ {personal.email}</span>}
          {personal?.phone && <span>✆ {personal.phone}</span>}
          {personal?.location && <span>⊙ {personal.location}</span>}
          {personal?.linkedin && <span>in {personal.linkedin}</span>}
          {personal?.github && <span>⌥ {personal.github}</span>}
        </div>
      </div>

      {/* Body */}
      <div className="px-8 py-5 space-y-5">
        {otherSections.map((section) => (
          <SectionRenderer key={section.id} section={section} color={color_theme} />
        ))}
      </div>
    </div>
  )
}

function SectionRenderer({ section, color }: { section: CVSection; color: string }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <h2 className="text-sm font-bold uppercase tracking-wide" style={{ color }}>
          {section.title}
        </h2>
        <div className="flex-1 h-px" style={{ backgroundColor: color + '40' }} />
      </div>
      <SectionBody section={section} />
    </div>
  )
}

function SectionBody({ section }: { section: CVSection }) {
  switch (section.type) {
    case 'summary': {
      const d = section.data as SummaryData
      return <p className="text-gray-700 leading-relaxed">{d.content || '—'}</p>
    }
    case 'experience': {
      const d = section.data as ExperienceData
      if (!d?.items?.length) return <p className="text-gray-400 italic">Chưa có kinh nghiệm</p>
      return (
        <div className="space-y-3">
          {d.items.map((item) => (
            <div key={item.id}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-gray-800">{item.position}</p>
                  <p className="text-gray-600">{item.company}</p>
                </div>
                <p className="text-gray-400 shrink-0 ml-4">
                  {item.start_date}{item.start_date ? ' — ' : ''}{item.is_current ? 'Hiện tại' : item.end_date}
                </p>
              </div>
              {item.description && (
                <p className="mt-1 text-gray-700 whitespace-pre-line">{item.description}</p>
              )}
            </div>
          ))}
        </div>
      )
    }
    case 'education': {
      const d = section.data as EducationData
      if (!d?.items?.length) return <p className="text-gray-400 italic">Chưa có học vấn</p>
      return (
        <div className="space-y-2">
          {d.items.map((item) => (
            <div key={item.id} className="flex items-start justify-between">
              <div>
                <p className="font-semibold text-gray-800">{item.school}</p>
                <p className="text-gray-600">{[item.degree, item.field].filter(Boolean).join(', ')}</p>
                {item.gpa && <p className="text-gray-500">GPA: {item.gpa}</p>}
              </div>
              <p className="text-gray-400 shrink-0 ml-4">
                {item.start_date}{item.start_date ? ' — ' : ''}{item.end_date}
              </p>
            </div>
          ))}
        </div>
      )
    }
    case 'skills': {
      const d = section.data as SkillsData
      if (!d?.items?.length) return <p className="text-gray-400 italic">Chưa có kỹ năng</p>
      return (
        <div className="flex flex-wrap gap-2">
          {d.items.map((item) => (
            <span
              key={item.id}
              className="px-2 py-0.5 rounded-full text-xs font-medium border border-gray-200 text-gray-700 bg-gray-50"
            >
              {item.name}
              {item.level >= 4 && ' ★'}
            </span>
          ))}
        </div>
      )
    }
    default:
      return null
  }
}
