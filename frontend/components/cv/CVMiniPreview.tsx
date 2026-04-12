'use client'

/**
 * CVMiniPreview
 *
 * Render bản thu nhỏ của CV preview, dùng cho:
 * - Template card trong trang /cv/new
 * - Thumbnail trong CVCard (dashboard)
 *
 * Không phụ thuộc editorStore — nhận props trực tiếp.
 * Scale-down bằng CSS transform để giữ nguyên font/layout thật.
 */

import type { CVSection, PersonalData, SummaryData, ExperienceData, EducationData, SkillsData } from '@/types'

interface CVMiniPreviewProps {
  sections: CVSection[]
  colorTheme: string
  /** Chiều rộng container hiển thị (px). Mini preview sẽ scale vừa vào đây. Default: 160 */
  containerWidth?: number
  /** Khoảng cách (px) giữa viền container và nội dung CV — trên / trái / phải. Default: 8 */
  gap?: number
}

/** Kích thước A4 gốc của CVPreview */
const CV_FULL_WIDTH = 595

export function CVMiniPreview({ sections, colorTheme, containerWidth = 160, gap = 8 }: CVMiniPreviewProps) {
  // CV được scale xuống trong vùng (containerWidth - gap * 2) để có khoảng trống trái/phải
  const cvDisplayWidth = containerWidth - gap * 2
  const scale = cvDisplayWidth / CV_FULL_WIDTH
  const cvDisplayHeight = Math.round(841 * scale)
  // Chiều cao container = CV + khoảng trống trên
  const containerHeight = cvDisplayHeight + gap

  const sorted = [...sections].sort((a, b) => a.order - b.order).filter((s) => s.visible)
  const personal = sorted.find((s) => s.type === 'personal')?.data as Partial<PersonalData> | undefined
  const otherSections = sorted.filter((s) => s.type !== 'personal')

  const hasName = !!(personal?.full_name)
  const hasJob = !!(personal?.job_title)

  return (
    <div
      style={{ width: containerWidth, height: containerHeight, overflow: 'hidden', position: 'relative' }}
    >
      {/* CV full-size được scale down, offset gap px từ trên và trái */}
      <div
        style={{
          width: CV_FULL_WIDTH,
          minHeight: 841,
          backgroundColor: 'white',
          transformOrigin: 'top left',
          transform: `scale(${scale})`,
          fontFamily: 'Inter, sans-serif',
          fontSize: 11,
          lineHeight: 1.5,
          position: 'absolute',
          top: gap,
          left: gap,
          pointerEvents: 'none',
          borderRadius: 2,
          boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
        }}
      >
        {/* Header */}
        <div style={{ backgroundColor: colorTheme, padding: '24px 32px 20px' }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: 'white', lineHeight: 1.2 }}>
            {hasName ? personal!.full_name : <BlankLine width={140} opacity={0.5} />}
          </div>
          {hasJob ? (
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.85)', marginTop: 4 }}>
              {personal!.job_title}
            </div>
          ) : (
            <BlankLine width={90} opacity={0.35} style={{ marginTop: 6 }} />
          )}
          {/* Contact row */}
          <div style={{ display: 'flex', gap: 16, marginTop: 12, flexWrap: 'wrap', color: 'rgba(255,255,255,0.75)', fontSize: 10 }}>
            {personal?.email
              ? <span>✉ {personal.email}</span>
              : <BlankLine width={80} opacity={0.3} />}
            {personal?.phone && <span>✆ {personal.phone}</span>}
            {personal?.location && <span>⊙ {personal.location}</span>}
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: '20px 32px', display: 'flex', flexDirection: 'column', gap: 18 }}>
          {otherSections.length === 0 ? (
            // Blank state — đường kẻ placeholder
            <BlankBody colorTheme={colorTheme} />
          ) : (
            otherSections.map((section) => (
              <MiniSection key={section.id} section={section} color={colorTheme} />
            ))
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Blank state helpers ──────────────────────────────────────────────────────

function BlankLine({ width, opacity = 0.2, style = {} }: { width: number; opacity?: number; style?: React.CSSProperties }) {
  return (
    <div style={{
      height: 8,
      width,
      borderRadius: 4,
      backgroundColor: 'rgba(255,255,255,1)',
      opacity,
      ...style,
    }} />
  )
}

function BlankBodyLine({ width, color }: { width: number | string; color: string }) {
  return (
    <div style={{
      height: 7,
      width,
      borderRadius: 4,
      backgroundColor: color,
      opacity: 0.12,
    }} />
  )
}

function BlankBody({ colorTheme }: { colorTheme: string }) {
  return (
    <>
      {[
        [180, 120, 150],
        [160, 100, 140],
        [170, 130, 110],
      ].map((widths, gi) => (
        <div key={gi} style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
          {/* Section title placeholder */}
          <BlankBodyLine width={70} color={colorTheme} />
          <div style={{ height: 1, backgroundColor: colorTheme, opacity: 0.15, marginBottom: 2 }} />
          {widths.map((w, i) => (
            <BlankBodyLine key={i} width={w} color={colorTheme} />
          ))}
        </div>
      ))}
    </>
  )
}

// ─── Mini section renderer ────────────────────────────────────────────────────

function MiniSection({ section, color }: { section: CVSection; color: string }) {
  const hasContent = sectionHasContent(section)
  return (
    <div>
      {/* Section title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color }}>
          {section.title}
        </span>
        <div style={{ flex: 1, height: 1, backgroundColor: color, opacity: 0.3 }} />
      </div>

      {hasContent
        ? <MiniSectionBody section={section} color={color} />
        : <MiniBlankLines color={color} />
      }
    </div>
  )
}

function MiniBlankLines({ color }: { color: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <BlankBodyLine width={220} color={color} />
      <BlankBodyLine width={170} color={color} />
    </div>
  )
}

function sectionHasContent(section: CVSection): boolean {
  switch (section.type) {
    case 'summary': return !!((section.data as SummaryData).content)
    case 'experience': return !!((section.data as ExperienceData).items?.length)
    case 'education': return !!((section.data as EducationData).items?.length)
    case 'skills': return !!((section.data as SkillsData).items?.length)
    default: return false
  }
}

function MiniSectionBody({ section, color }: { section: CVSection; color: string }) {
  switch (section.type) {
    case 'summary': {
      const content = (section.data as SummaryData).content
      return (
        <p style={{ fontSize: 10, color: '#4B5563', lineHeight: 1.6, margin: 0 }}>
          {content.length > 120 ? content.slice(0, 120) + '…' : content}
        </p>
      )
    }
    case 'experience': {
      const items = (section.data as ExperienceData).items
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {items.slice(0, 2).map((item) => (
            <div key={item.id}>
              <div style={{ fontWeight: 600, fontSize: 10, color: '#1F2937' }}>{item.position}</div>
              <div style={{ fontSize: 10, color: '#6B7280' }}>{item.company}</div>
            </div>
          ))}
          {items.length > 2 && (
            <div style={{ fontSize: 9, color: '#9CA3AF' }}>+{items.length - 2} vị trí khác</div>
          )}
        </div>
      )
    }
    case 'education': {
      const items = (section.data as EducationData).items
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {items.slice(0, 2).map((item) => (
            <div key={item.id}>
              <div style={{ fontWeight: 600, fontSize: 10, color: '#1F2937' }}>{item.school}</div>
              <div style={{ fontSize: 10, color: '#6B7280' }}>{[item.degree, item.field].filter(Boolean).join(', ')}</div>
            </div>
          ))}
        </div>
      )
    }
    case 'skills': {
      const items = (section.data as SkillsData).items
      return (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
          {items.slice(0, 8).map((item) => (
            <span key={item.id} style={{
              fontSize: 9,
              padding: '2px 7px',
              borderRadius: 999,
              border: '1px solid #E5E7EB',
              color: '#374151',
              backgroundColor: '#F9FAFB',
            }}>
              {item.name}
            </span>
          ))}
          {items.length > 8 && (
            <span style={{ fontSize: 9, color: '#9CA3AF' }}>+{items.length - 8}</span>
          )}
        </div>
      )
    }
    default:
      return null
  }
}
