/**
 * Template: Modern
 * Layout: Single-column, colored header, section title + underline
 * Free template
 */

import type { TemplateProps } from '../types'
import {
  getPersonal, getSummary, getExperience, getEducation, getSkills, getVisibleSections,
} from '../types'

const S = {
  page: {
    width: 595,
    minHeight: 841,
    backgroundColor: '#ffffff',
    fontFamily: "'Inter', 'Helvetica Neue', Arial, sans-serif",
    fontSize: 11,
    color: '#1F2937',
    lineHeight: 1.5,
  } as React.CSSProperties,

  header: (color: string): React.CSSProperties => ({
    backgroundColor: color,
    padding: '28px 36px 22px',
  }),

  name: {
    fontSize: 22,
    fontWeight: 700,
    color: '#ffffff',
    lineHeight: 1.2,
    margin: 0,
  } as React.CSSProperties,

  jobTitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 4,
    fontWeight: 400,
  } as React.CSSProperties,

  contactRow: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: '6px 20px',
    marginTop: 14,
    color: 'rgba(255,255,255,0.8)',
    fontSize: 10,
  } as React.CSSProperties,

  body: {
    padding: '22px 36px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 20,
  } as React.CSSProperties,

  sectionTitle: (color: string): React.CSSProperties => ({
    fontSize: 10,
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    color,
    marginBottom: 2,
  }),

  sectionDivider: (color: string): React.CSSProperties => ({
    height: 1.5,
    backgroundColor: color,
    opacity: 0.25,
    marginBottom: 10,
  }),

  itemTitle: {
    fontWeight: 600,
    fontSize: 11,
    color: '#111827',
  } as React.CSSProperties,

  itemSub: {
    fontSize: 10,
    color: '#6B7280',
    marginTop: 1,
  } as React.CSSProperties,

  itemDate: {
    fontSize: 9.5,
    color: '#9CA3AF',
    marginTop: 1,
  } as React.CSSProperties,

  itemDesc: {
    fontSize: 10,
    color: '#4B5563',
    marginTop: 5,
    lineHeight: 1.6,
  } as React.CSSProperties,
}

export function ModernTemplate({ sections, colorTheme }: TemplateProps) {
  const personal = getPersonal(sections)
  const summary = getSummary(sections)
  const experience = getExperience(sections)
  const education = getEducation(sections)
  const skills = getSkills(sections)
  const visibleSections = getVisibleSections(sections)

  const contactItems = [
    personal.email && `✉ ${personal.email}`,
    personal.phone && `✆ ${personal.phone}`,
    personal.location && `⊙ ${personal.location}`,
    personal.website && `⊕ ${personal.website}`,
    personal.linkedin && `in ${personal.linkedin}`,
    personal.github && `⌥ ${personal.github}`,
  ].filter(Boolean) as string[]

  return (
    <div style={S.page}>
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div style={S.header(colorTheme)}>
        <div style={S.name}>{personal.full_name || 'Họ và tên'}</div>
        {(personal.job_title) && (
          <div style={S.jobTitle}>{personal.job_title}</div>
        )}
        {contactItems.length > 0 && (
          <div style={S.contactRow}>
            {contactItems.map((item, i) => (
              <span key={i}>{item}</span>
            ))}
          </div>
        )}
      </div>

      {/* ── Body ───────────────────────────────────────────────────────── */}
      <div style={S.body}>
        {/* Summary */}
        {visibleSections.some((s) => s.type === 'summary') && summary && (
          <Section title="Giới thiệu" color={colorTheme}>
            <p style={{ fontSize: 10.5, color: '#374151', lineHeight: 1.7, margin: 0 }}>
              {summary}
            </p>
          </Section>
        )}

        {/* Experience */}
        {visibleSections.some((s) => s.type === 'experience') && experience.length > 0 && (
          <Section title="Kinh nghiệm" color={colorTheme}>
            {experience.map((item, i) => (
              <div key={item.id} style={{ marginBottom: i < experience.length - 1 ? 14 : 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={S.itemTitle}>{item.position}</div>
                    <div style={S.itemSub}>{item.company}</div>
                  </div>
                  <div style={S.itemDate}>
                    {item.start_date} – {item.is_current ? 'Hiện tại' : item.end_date}
                  </div>
                </div>
                {item.description && (
                  <div style={S.itemDesc}>{item.description}</div>
                )}
              </div>
            ))}
          </Section>
        )}

        {/* Education */}
        {visibleSections.some((s) => s.type === 'education') && education.length > 0 && (
          <Section title="Học vấn" color={colorTheme}>
            {education.map((item, i) => (
              <div key={item.id} style={{ marginBottom: i < education.length - 1 ? 12 : 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={S.itemTitle}>{item.school}</div>
                    <div style={S.itemSub}>
                      {[item.degree, item.field].filter(Boolean).join(' · ')}
                      {item.gpa && ` · GPA: ${item.gpa}`}
                    </div>
                  </div>
                  <div style={S.itemDate}>{item.start_date} – {item.end_date}</div>
                </div>
              </div>
            ))}
          </Section>
        )}

        {/* Skills */}
        {visibleSections.some((s) => s.type === 'skills') && skills.length > 0 && (
          <Section title="Kỹ năng" color={colorTheme}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {skills.map((skill) => (
                <span
                  key={skill.id}
                  style={{
                    fontSize: 9.5,
                    padding: '3px 9px',
                    borderRadius: 999,
                    backgroundColor: colorTheme + '18',
                    color: colorTheme,
                    border: `1px solid ${colorTheme}30`,
                    fontWeight: 500,
                  }}
                >
                  {skill.name}
                </span>
              ))}
            </div>
          </Section>
        )}
      </div>
    </div>
  )
}

function Section({
  title, color, children,
}: {
  title: string
  color: string
  children: React.ReactNode
}) {
  return (
    <div>
      <div style={S.sectionTitle(color)}>{title}</div>
      <div style={S.sectionDivider(color)} />
      {children}
    </div>
  )
}
