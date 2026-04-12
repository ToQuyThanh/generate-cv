/**
 * Template: Minimal
 * Layout: Two-column (main 65% / sidebar 35%), header top full-width, không background đậm
 * Free template
 */

import type { TemplateProps } from '../types'
import {
  getPersonal, getSummary, getExperience, getEducation, getSkills, getVisibleSections,
} from '../types'

export function MinimalTemplate({ sections, colorTheme }: TemplateProps) {
  const personal = getPersonal(sections)
  const summary = getSummary(sections)
  const experience = getExperience(sections)
  const education = getEducation(sections)
  const skills = getSkills(sections)
  const visibleSections = getVisibleSections(sections)

  return (
    <div style={{
      width: 595,
      minHeight: 841,
      backgroundColor: '#ffffff',
      fontFamily: "'Inter', 'Helvetica Neue', Arial, sans-serif",
      fontSize: 11,
      color: '#1F2937',
      lineHeight: 1.5,
    }}>
      {/* ── Header strip ────────────────────────────────────────────────── */}
      <div style={{ padding: '26px 32px 18px', borderBottom: `3px solid ${colorTheme}` }}>
        <div style={{ fontSize: 21, fontWeight: 700, color: '#111827', letterSpacing: '-0.01em' }}>
          {personal.full_name || 'Họ và tên'}
        </div>
        {personal.job_title && (
          <div style={{ fontSize: 11.5, color: colorTheme, fontWeight: 600, marginTop: 3 }}>
            {personal.job_title}
          </div>
        )}
      </div>

      {/* ── Two-column body ─────────────────────────────────────────────── */}
      <div style={{ display: 'flex', minHeight: 720 }}>

        {/* Main column — 65% */}
        <div style={{ flex: '0 0 385px', padding: '20px 24px 20px 32px', display: 'flex', flexDirection: 'column', gap: 18 }}>
          {/* Summary */}
          {visibleSections.some((s) => s.type === 'summary') && summary && (
            <MinSection title="Về tôi" color={colorTheme}>
              <p style={{ margin: 0, fontSize: 10.5, color: '#374151', lineHeight: 1.7 }}>{summary}</p>
            </MinSection>
          )}

          {/* Experience */}
          {visibleSections.some((s) => s.type === 'experience') && experience.length > 0 && (
            <MinSection title="Kinh nghiệm" color={colorTheme}>
              {experience.map((item, i) => (
                <div key={item.id} style={{ marginBottom: i < experience.length - 1 ? 13 : 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 11, color: '#111827' }}>{item.position}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 1 }}>
                    <span style={{ fontSize: 10, color: colorTheme, fontWeight: 500 }}>{item.company}</span>
                    <span style={{ fontSize: 9.5, color: '#9CA3AF' }}>
                      {item.start_date} – {item.is_current ? 'Nay' : item.end_date}
                    </span>
                  </div>
                  {item.description && (
                    <div style={{ fontSize: 10, color: '#4B5563', marginTop: 5, lineHeight: 1.65 }}>
                      {item.description}
                    </div>
                  )}
                </div>
              ))}
            </MinSection>
          )}

          {/* Education */}
          {visibleSections.some((s) => s.type === 'education') && education.length > 0 && (
            <MinSection title="Học vấn" color={colorTheme}>
              {education.map((item, i) => (
                <div key={item.id} style={{ marginBottom: i < education.length - 1 ? 11 : 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 11, color: '#111827' }}>{item.school}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 1 }}>
                    <span style={{ fontSize: 10, color: '#6B7280' }}>
                      {[item.degree, item.field].filter(Boolean).join(', ')}
                    </span>
                    <span style={{ fontSize: 9.5, color: '#9CA3AF' }}>
                      {item.start_date} – {item.end_date}
                    </span>
                  </div>
                  {item.gpa && (
                    <div style={{ fontSize: 9.5, color: '#9CA3AF', marginTop: 2 }}>GPA {item.gpa}</div>
                  )}
                </div>
              ))}
            </MinSection>
          )}
        </div>

        {/* Divider */}
        <div style={{ width: 1, backgroundColor: '#F3F4F6', flexShrink: 0 }} />

        {/* Sidebar — 35% */}
        <div style={{ flex: 1, padding: '20px 24px', backgroundColor: '#FAFAFA', display: 'flex', flexDirection: 'column', gap: 18 }}>
          {/* Contact */}
          <MinSection title="Liên hệ" color={colorTheme}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              {[
                { label: 'Email', val: personal.email },
                { label: 'Phone', val: personal.phone },
                { label: 'Địa chỉ', val: personal.location },
                { label: 'Website', val: personal.website },
                { label: 'LinkedIn', val: personal.linkedin },
                { label: 'GitHub', val: personal.github },
              ].filter((r) => r.val).map((r) => (
                <div key={r.label}>
                  <div style={{ fontSize: 8.5, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {r.label}
                  </div>
                  <div style={{ fontSize: 10, color: '#374151', wordBreak: 'break-all' }}>{r.val}</div>
                </div>
              ))}
            </div>
          </MinSection>

          {/* Skills */}
          {visibleSections.some((s) => s.type === 'skills') && skills.length > 0 && (
            <MinSection title="Kỹ năng" color={colorTheme}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                {skills.map((skill) => (
                  <div key={skill.id}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                      <span style={{ fontSize: 10, color: '#374151' }}>{skill.name}</span>
                      <span style={{ fontSize: 9, color: '#9CA3AF' }}>{skill.level * 20}%</span>
                    </div>
                    {/* Progress bar */}
                    <div style={{ height: 3, backgroundColor: '#E5E7EB', borderRadius: 2 }}>
                      <div style={{
                        height: '100%',
                        width: `${skill.level * 20}%`,
                        backgroundColor: colorTheme,
                        borderRadius: 2,
                      }} />
                    </div>
                  </div>
                ))}
              </div>
            </MinSection>
          )}
        </div>
      </div>
    </div>
  )
}

function MinSection({ title, color, children }: { title: string; color: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{
        fontSize: 9,
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.1em',
        color,
        marginBottom: 8,
      }}>
        {title}
      </div>
      {children}
    </div>
  )
}
