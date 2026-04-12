/**
 * Template: Sidebar
 * Layout: Two-column — sidebar trái màu đậm (35%) + main phải (65%)
 * Premium template
 */

import type { TemplateProps } from '../types'
import {
  getPersonal, getSummary, getExperience, getEducation, getSkills, getVisibleSections,
} from '../types'

/** Làm nhạt hex color một tỷ lệ (0–1) */
function lighten(hex: string, amount: number): string {
  const n = parseInt(hex.replace('#', ''), 16)
  const r = Math.min(255, Math.round(((n >> 16) & 0xff) + (255 - ((n >> 16) & 0xff)) * amount))
  const g = Math.min(255, Math.round(((n >> 8) & 0xff) + (255 - ((n >> 8) & 0xff)) * amount))
  const b = Math.min(255, Math.round((n & 0xff) + (255 - (n & 0xff)) * amount))
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
}

export function SidebarTemplate({ sections, colorTheme }: TemplateProps) {
  const personal = getPersonal(sections)
  const summary = getSummary(sections)
  const experience = getExperience(sections)
  const education = getEducation(sections)
  const skills = getSkills(sections)
  const visibleSections = getVisibleSections(sections)

  const sidebarBg = colorTheme
  const sidebarLight = lighten(colorTheme, 0.15)

  return (
    <div style={{
      width: 595,
      minHeight: 841,
      backgroundColor: '#ffffff',
      fontFamily: "'Inter', 'Helvetica Neue', Arial, sans-serif",
      fontSize: 11,
      color: '#1F2937',
      lineHeight: 1.5,
      display: 'flex',
    }}>

      {/* ── Sidebar trái (35%) ─────────────────────────────────────────── */}
      <div style={{
        width: 208,
        minHeight: 841,
        backgroundColor: sidebarBg,
        padding: '32px 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: 24,
        flexShrink: 0,
      }}>

        {/* Avatar placeholder + tên */}
        <div style={{ textAlign: 'center' }}>
          {/* Avatar circle */}
          <div style={{
            width: 72,
            height: 72,
            borderRadius: '50%',
            backgroundColor: 'rgba(255,255,255,0.2)',
            margin: '0 auto 12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 24,
            fontWeight: 700,
            color: '#ffffff',
            letterSpacing: '-0.02em',
          }}>
            {personal.full_name
              ? personal.full_name.split(' ').slice(-2).map((w: string) => w[0]).join('').toUpperCase()
              : 'CV'}
          </div>
          <div style={{
            fontSize: 14,
            fontWeight: 700,
            color: '#ffffff',
            lineHeight: 1.3,
          }}>
            {personal.full_name || 'Họ và tên'}
          </div>
          {personal.job_title && (
            <div style={{
              fontSize: 9.5,
              color: 'rgba(255,255,255,0.75)',
              marginTop: 4,
              fontWeight: 400,
              letterSpacing: '0.03em',
            }}>
              {personal.job_title}
            </div>
          )}
        </div>

        {/* Divider */}
        <div style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.2)' }} />

        {/* Contact */}
        <SideSection title="Liên hệ" light>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            {[
              { icon: '✉', val: personal.email },
              { icon: '✆', val: personal.phone },
              { icon: '⊙', val: personal.location },
              { icon: '⊕', val: personal.website },
              { icon: 'in', val: personal.linkedin },
              { icon: '⌥', val: personal.github },
            ].filter((r) => r.val).map((r, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.55)', width: 12, flexShrink: 0, marginTop: 1 }}>
                  {r.icon}
                </span>
                <span style={{ fontSize: 9.5, color: 'rgba(255,255,255,0.85)', wordBreak: 'break-all', lineHeight: 1.4 }}>
                  {r.val}
                </span>
              </div>
            ))}
          </div>
        </SideSection>

        {/* Skills */}
        {visibleSections.some((s) => s.type === 'skills') && skills.length > 0 && (
          <SideSection title="Kỹ năng" light>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {skills.map((skill) => (
                <div key={skill.id}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 9.5, color: 'rgba(255,255,255,0.9)' }}>{skill.name}</span>
                  </div>
                  {/* Progress bar */}
                  <div style={{ height: 3, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 2 }}>
                    <div style={{
                      height: '100%',
                      width: `${skill.level * 20}%`,
                      backgroundColor: 'rgba(255,255,255,0.85)',
                      borderRadius: 2,
                    }} />
                  </div>
                </div>
              ))}
            </div>
          </SideSection>
        )}
      </div>

      {/* ── Main phải (65%) ────────────────────────────────────────────── */}
      <div style={{
        flex: 1,
        padding: '32px 28px',
        display: 'flex',
        flexDirection: 'column',
        gap: 20,
      }}>

        {/* Summary */}
        {visibleSections.some((s) => s.type === 'summary') && summary && (
          <MainSection title="Về tôi" color={colorTheme}>
            <p style={{ margin: 0, fontSize: 10.5, color: '#374151', lineHeight: 1.75 }}>
              {summary}
            </p>
          </MainSection>
        )}

        {/* Experience */}
        {visibleSections.some((s) => s.type === 'experience') && experience.length > 0 && (
          <MainSection title="Kinh nghiệm" color={colorTheme}>
            {experience.map((item, i) => (
              <div key={item.id} style={{ marginBottom: i < experience.length - 1 ? 16 : 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 11, color: '#111827' }}>{item.position}</div>
                    <div style={{ fontSize: 10.5, color: colorTheme, fontWeight: 600, marginTop: 1 }}>
                      {item.company}
                    </div>
                  </div>
                  <div style={{
                    fontSize: 9,
                    color: '#ffffff',
                    backgroundColor: colorTheme,
                    padding: '2px 8px',
                    borderRadius: 999,
                    whiteSpace: 'nowrap',
                    marginTop: 1,
                  }}>
                    {item.start_date} – {item.is_current ? 'Nay' : item.end_date}
                  </div>
                </div>
                {item.description && (
                  <div style={{ fontSize: 10, color: '#4B5563', marginTop: 6, lineHeight: 1.65 }}>
                    {item.description}
                  </div>
                )}
              </div>
            ))}
          </MainSection>
        )}

        {/* Education */}
        {visibleSections.some((s) => s.type === 'education') && education.length > 0 && (
          <MainSection title="Học vấn" color={colorTheme}>
            {education.map((item, i) => (
              <div key={item.id} style={{ marginBottom: i < education.length - 1 ? 12 : 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 11, color: '#111827' }}>{item.school}</div>
                    <div style={{ fontSize: 10, color: '#6B7280', marginTop: 1 }}>
                      {[item.degree, item.field].filter(Boolean).join(' · ')}
                      {item.gpa && ` · GPA: ${item.gpa}`}
                    </div>
                  </div>
                  <div style={{ fontSize: 9, color: '#9CA3AF', whiteSpace: 'nowrap', marginTop: 1 }}>
                    {item.start_date} – {item.end_date}
                  </div>
                </div>
              </div>
            ))}
          </MainSection>
        )}
      </div>
    </div>
  )
}

// ─── Section helpers ──────────────────────────────────────────────────────────

function SideSection({ title, children, light }: { title: string; children: React.ReactNode; light?: boolean }) {
  return (
    <div>
      <div style={{
        fontSize: 8.5,
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.12em',
        color: light ? 'rgba(255,255,255,0.55)' : '#6B7280',
        marginBottom: 8,
      }}>
        {title}
      </div>
      {children}
    </div>
  )
}

function MainSection({ title, color, children }: { title: string; color: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <div style={{
          fontSize: 10,
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          color,
        }}>
          {title}
        </div>
        <div style={{ flex: 1, height: 1.5, backgroundColor: color, opacity: 0.2 }} />
      </div>
      {children}
    </div>
  )
}
