/**
 * Template: Compact
 * Layout: Single-column, header ngang nhỏ, kỹ năng dạng dot-rating, tối ưu cho nhiều kinh nghiệm
 * Free template
 */
import type { TemplateProps } from '../types'
import { getPersonal, getSummary, getExperience, getEducation, getSkills, getVisibleSections } from '../types'

export function CompactTemplate({ sections, colorTheme }: TemplateProps) {
  const personal = getPersonal(sections)
  const summary = getSummary(sections)
  const experience = getExperience(sections)
  const education = getEducation(sections)
  const skills = getSkills(sections)
  const visibleSections = getVisibleSections(sections)

  const contacts = [personal.email, personal.phone, personal.location, personal.linkedin, personal.github].filter(Boolean) as string[]

  return (
    <div style={{ width: 595, minHeight: 841, backgroundColor: '#fff', fontFamily: "'Inter', 'Helvetica Neue', Arial, sans-serif", fontSize: 10, color: '#1a1a1a', lineHeight: 1.5, padding: '28px 38px', boxSizing: 'border-box' as const }}>

      {/* Header — horizontal compact */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 12, borderBottom: `2px solid ${colorTheme}`, marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#0f172a', lineHeight: 1.1 }}>{personal.full_name || 'Họ và tên'}</div>
          {personal.job_title && (
            <div style={{ fontSize: 10, color: colorTheme, fontWeight: 600, marginTop: 3 }}>{personal.job_title}</div>
          )}
        </div>
        {contacts.length > 0 && (
          <div style={{ textAlign: 'right', fontSize: 9, color: '#555', lineHeight: 1.7 }}>
            {contacts.map((c, i) => <div key={i}>{c}</div>)}
          </div>
        )}
      </div>

      {/* Two-column layout: main (63%) + skills sidebar (37%) */}
      <div style={{ display: 'flex', gap: 20 }}>
        {/* Main */}
        <div style={{ flex: '0 0 350px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {visibleSections.some(s => s.type === 'summary') && summary && (
            <CompactSection title="Tóm tắt" color={colorTheme}>
              <p style={{ margin: 0, fontSize: 10, color: '#374151', lineHeight: 1.7 }}>{summary}</p>
            </CompactSection>
          )}

          {visibleSections.some(s => s.type === 'experience') && experience.length > 0 && (
            <CompactSection title="Kinh nghiệm" color={colorTheme}>
              {experience.map((item, i) => (
                <div key={item.id} style={{ marginBottom: i < experience.length - 1 ? 11 : 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <div style={{ fontWeight: 700, fontSize: 10.5, color: '#0f172a' }}>{item.position}</div>
                    <div style={{ fontSize: 9, color: '#888', whiteSpace: 'nowrap' }}>{item.start_date} – {item.is_current ? 'Nay' : item.end_date}</div>
                  </div>
                  <div style={{ fontSize: 9.5, color: colorTheme, fontWeight: 600, marginTop: 1 }}>{item.company}</div>
                  {item.description && (
                    <div style={{ fontSize: 9.5, color: '#444', marginTop: 4, lineHeight: 1.6 }}>{item.description}</div>
                  )}
                </div>
              ))}
            </CompactSection>
          )}

          {visibleSections.some(s => s.type === 'education') && education.length > 0 && (
            <CompactSection title="Học vấn" color={colorTheme}>
              {education.map((item, i) => (
                <div key={item.id} style={{ marginBottom: i < education.length - 1 ? 9 : 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <div style={{ fontWeight: 700, fontSize: 10.5, color: '#0f172a' }}>{item.school}</div>
                    <div style={{ fontSize: 9, color: '#888', whiteSpace: 'nowrap' }}>{item.start_date} – {item.end_date}</div>
                  </div>
                  <div style={{ fontSize: 9.5, color: '#555', marginTop: 1 }}>
                    {[item.degree, item.field].filter(Boolean).join(', ')}{item.gpa ? ` · GPA ${item.gpa}` : ''}
                  </div>
                </div>
              ))}
            </CompactSection>
          )}
        </div>

        {/* Sidebar skills */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 14 }}>
          {visibleSections.some(s => s.type === 'skills') && skills.length > 0 && (
            <CompactSection title="Kỹ năng" color={colorTheme}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {skills.map(skill => (
                  <div key={skill.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 10, color: '#374151' }}>{skill.name}</span>
                    <div style={{ display: 'flex', gap: 3 }}>
                      {[1,2,3,4,5].map(dot => (
                        <div key={dot} style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: dot <= skill.level ? colorTheme : '#E5E7EB' }} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CompactSection>
          )}
        </div>
      </div>
    </div>
  )
}

function CompactSection({ title, color, children }: { title: string; color: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: 8.5, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.1em', color, borderBottom: `1px solid ${color}40`, paddingBottom: 3, marginBottom: 8 }}>
        {title}
      </div>
      {children}
    </div>
  )
}
