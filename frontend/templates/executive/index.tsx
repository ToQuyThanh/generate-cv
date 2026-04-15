/**
 * Template: Executive
 * Layout: Single-column, header trắng sang trọng với tên lớn bên trái + contact bên phải
 * Premium template
 */
import type { TemplateProps } from '../types'
import { getPersonal, getSummary, getExperience, getEducation, getSkills, getVisibleSections } from '../types'

export function ExecutiveTemplate({ sections, colorTheme }: TemplateProps) {
  const personal = getPersonal(sections)
  const summary = getSummary(sections)
  const experience = getExperience(sections)
  const education = getEducation(sections)
  const skills = getSkills(sections)
  const visibleSections = getVisibleSections(sections)

  return (
    <div style={{ width: 595, minHeight: 841, backgroundColor: '#fff', fontFamily: "'Georgia', 'Times New Roman', serif", fontSize: 11, color: '#1a1a1a', lineHeight: 1.6 }}>
      {/* Header */}
      <div style={{ padding: '36px 44px 22px', borderBottom: `4px solid ${colorTheme}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div>
            <div style={{ fontSize: 26, fontWeight: 700, color: '#0f172a', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
              {personal.full_name || 'Họ và tên'}
            </div>
            {personal.job_title && (
              <div style={{ fontSize: 12, color: colorTheme, fontWeight: 600, marginTop: 6, letterSpacing: '0.02em' }}>
                {personal.job_title}
              </div>
            )}
          </div>
          <div style={{ textAlign: 'right', fontSize: 9.5, color: '#555', lineHeight: 1.8 }}>
            {personal.email && <div>{personal.email}</div>}
            {personal.phone && <div>{personal.phone}</div>}
            {personal.location && <div>{personal.location}</div>}
            {personal.linkedin && <div>{personal.linkedin}</div>}
            {personal.github && <div>{personal.github}</div>}
          </div>
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: '22px 44px', display: 'flex', flexDirection: 'column', gap: 20 }}>
        {visibleSections.some(s => s.type === 'summary') && summary && (
          <ExecSection title="Executive Summary" color={colorTheme}>
            <p style={{ margin: 0, fontSize: 10.5, color: '#374151', lineHeight: 1.8, fontStyle: 'italic' }}>{summary}</p>
          </ExecSection>
        )}

        {visibleSections.some(s => s.type === 'experience') && experience.length > 0 && (
          <ExecSection title="Professional Experience" color={colorTheme}>
            {experience.map((item, i) => (
              <div key={item.id} style={{ marginBottom: i < experience.length - 1 ? 16 : 0, paddingLeft: 12, borderLeft: `2.5px solid ${colorTheme}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 11.5, color: '#0f172a' }}>{item.position}</div>
                    <div style={{ fontSize: 11, color: colorTheme, fontWeight: 600, marginTop: 1 }}>{item.company}</div>
                  </div>
                  <div style={{ fontSize: 9.5, color: '#777', fontStyle: 'italic', whiteSpace: 'nowrap' }}>
                    {item.start_date} – {item.is_current ? 'Hiện tại' : item.end_date}
                  </div>
                </div>
                {item.description && (
                  <div style={{ fontSize: 10, color: '#444', marginTop: 5, lineHeight: 1.7 }}>{item.description}</div>
                )}
              </div>
            ))}
          </ExecSection>
        )}

        {visibleSections.some(s => s.type === 'education') && education.length > 0 && (
          <ExecSection title="Education" color={colorTheme}>
            {education.map((item, i) => (
              <div key={item.id} style={{ marginBottom: i < education.length - 1 ? 11 : 0, display: 'flex', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 11, color: '#0f172a' }}>{item.school}</div>
                  <div style={{ fontSize: 10, color: '#555' }}>{[item.degree, item.field].filter(Boolean).join(', ')}{item.gpa ? ` · GPA ${item.gpa}` : ''}</div>
                </div>
                <div style={{ fontSize: 9.5, color: '#777', fontStyle: 'italic', whiteSpace: 'nowrap' }}>
                  {item.start_date} – {item.end_date}
                </div>
              </div>
            ))}
          </ExecSection>
        )}

        {visibleSections.some(s => s.type === 'skills') && skills.length > 0 && (
          <ExecSection title="Core Competencies" color={colorTheme}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px 24px' }}>
              {skills.map(skill => (
                <span key={skill.id} style={{ fontSize: 10, color: '#374151' }}>◆ {skill.name}</span>
              ))}
            </div>
          </ExecSection>
        )}
      </div>
    </div>
  )
}

function ExecSection({ title, color, children }: { title: string; color: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.12em', color, marginBottom: 10 }}>{title}</div>
      {children}
    </div>
  )
}
