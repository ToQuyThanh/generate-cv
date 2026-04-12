/**
 * Template: ATS Pro
 * Layout: Single-column, header đơn giản, section có đường kẻ accent, bullet points
 * ATS-friendly + trông chuyên nghiệp hơn ATS Clean
 * Premium template
 */
import type { TemplateProps } from '../types'
import { getPersonal, getSummary, getExperience, getEducation, getSkills, getVisibleSections } from '../types'

export function AtsProTemplate({ sections, colorTheme }: TemplateProps) {
  const personal = getPersonal(sections)
  const summary = getSummary(sections)
  const experience = getExperience(sections)
  const education = getEducation(sections)
  const skills = getSkills(sections)
  const visibleSections = getVisibleSections(sections)

  const contacts = [
    personal.email && `${personal.email}`,
    personal.phone && `${personal.phone}`,
    personal.location && `${personal.location}`,
    personal.linkedin && `${personal.linkedin}`,
    personal.github && `${personal.github}`,
  ].filter(Boolean) as string[]

  return (
    <div style={{ width: 595, minHeight: 841, backgroundColor: '#ffffff', fontFamily: "'Calibri', 'Arial', sans-serif", fontSize: 11, color: '#1a1a1a', lineHeight: 1.55, padding: '32px 42px', boxSizing: 'border-box' as const }}>

      {/* Header */}
      <div style={{ marginBottom: 18 }}>
        <div style={{ fontSize: 22, fontWeight: 700, color: colorTheme, letterSpacing: '-0.01em' }}>
          {personal.full_name || 'Họ và tên'}
        </div>
        {personal.job_title && (
          <div style={{ fontSize: 12, color: '#444', fontWeight: 600, marginTop: 3 }}>{personal.job_title}</div>
        )}
        {contacts.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2px 0', marginTop: 7, fontSize: 10, color: '#333' }}>
            {contacts.map((c, i) => (
              <span key={i}>
                {c}{i < contacts.length - 1 ? <span style={{ margin: '0 8px', color: '#bbb' }}>|</span> : null}
              </span>
            ))}
          </div>
        )}
      </div>

      <div style={{ height: 2, backgroundColor: colorTheme, marginBottom: 16 }} />

      {/* Body */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {visibleSections.some(s => s.type === 'summary') && summary && (
          <AtsProSection title="Professional Summary" color={colorTheme}>
            <p style={{ margin: 0, fontSize: 10.5, color: '#222', lineHeight: 1.75 }}>{summary}</p>
          </AtsProSection>
        )}

        {visibleSections.some(s => s.type === 'skills') && skills.length > 0 && (
          <AtsProSection title="Core Skills" color={colorTheme}>
            <div style={{ display: 'flex', flexWrap: 'wrap', columnGap: 0, rowGap: 0 }}>
              {skills.map((skill, i) => (
                <span key={skill.id} style={{ fontSize: 10.5, color: '#222', marginRight: i < skills.length - 1 ? 0 : 0 }}>
                  {skill.name}{i < skills.length - 1 ? <span style={{ margin: '0 8px', color: '#ccc' }}>·</span> : ''}
                </span>
              ))}
            </div>
          </AtsProSection>
        )}

        {visibleSections.some(s => s.type === 'experience') && experience.length > 0 && (
          <AtsProSection title="Work Experience" color={colorTheme}>
            {experience.map((item, i) => (
              <div key={item.id} style={{ marginBottom: i < experience.length - 1 ? 14 : 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <span style={{ fontWeight: 700, fontSize: 11, color: '#0f172a' }}>{item.position}</span>
                    <span style={{ fontSize: 10.5, color: '#555', marginLeft: 6 }}>— {item.company}</span>
                  </div>
                  <div style={{ fontSize: 10, color: '#666', whiteSpace: 'nowrap' }}>
                    {item.start_date} – {item.is_current ? 'Present' : item.end_date}
                  </div>
                </div>
                {item.description && (
                  <div style={{ fontSize: 10, color: '#333', marginTop: 5, lineHeight: 1.65, paddingLeft: 10, borderLeft: `2px solid ${colorTheme}40` }}>
                    {item.description}
                  </div>
                )}
              </div>
            ))}
          </AtsProSection>
        )}

        {visibleSections.some(s => s.type === 'education') && education.length > 0 && (
          <AtsProSection title="Education" color={colorTheme}>
            {education.map((item, i) => (
              <div key={item.id} style={{ marginBottom: i < education.length - 1 ? 10 : 0, display: 'flex', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 11, color: '#0f172a' }}>{item.school}</div>
                  <div style={{ fontSize: 10, color: '#555', marginTop: 1 }}>
                    {[item.degree, item.field].filter(Boolean).join(', ')}{item.gpa ? ` | GPA: ${item.gpa}` : ''}
                  </div>
                </div>
                <div style={{ fontSize: 10, color: '#666', whiteSpace: 'nowrap' }}>{item.start_date} – {item.end_date}</div>
              </div>
            ))}
          </AtsProSection>
        )}
      </div>
    </div>
  )
}

function AtsProSection({ title, color, children }: { title: string; color: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.08em', color, paddingBottom: 4, borderBottom: `1px solid ${color}50`, marginBottom: 10 }}>
        {title}
      </div>
      {children}
    </div>
  )
}
