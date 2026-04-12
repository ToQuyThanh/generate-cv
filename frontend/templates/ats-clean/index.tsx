/**
 * Template: ATS Clean
 * Layout: Single-column, hoàn toàn đơn giản, không background màu, không icon
 * Tối ưu máy quét ATS (Applicant Tracking System)
 * Free template
 */
import type { TemplateProps } from '../types'
import { getPersonal, getSummary, getExperience, getEducation, getSkills, getVisibleSections } from '../types'

export function AtsCleanTemplate({ sections, colorTheme }: TemplateProps) {
  const personal = getPersonal(sections)
  const summary = getSummary(sections)
  const experience = getExperience(sections)
  const education = getEducation(sections)
  const skills = getSkills(sections)
  const visibleSections = getVisibleSections(sections)

  const contacts = [personal.email, personal.phone, personal.location, personal.linkedin, personal.github, personal.website].filter(Boolean)

  return (
    <div style={{ width: 595, minHeight: 841, backgroundColor: '#ffffff', fontFamily: "'Arial', 'Helvetica', sans-serif", fontSize: 11, color: '#000', lineHeight: 1.5, padding: '36px 44px', boxSizing: 'border-box' as const }}>

      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 16 }}>
        <div style={{ fontSize: 20, fontWeight: 700, color: '#000', letterSpacing: '0.02em' }}>
          {personal.full_name || 'Họ và tên'}
        </div>
        {personal.job_title && (
          <div style={{ fontSize: 11, color: '#333', marginTop: 3 }}>{personal.job_title}</div>
        )}
        {contacts.length > 0 && (
          <div style={{ fontSize: 10, color: '#333', marginTop: 6, display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: '3px 12px' }}>
            {contacts.map((c, i) => <span key={i}>{c}</span>)}
          </div>
        )}
      </div>

      {/* Divider */}
      <div style={{ borderTop: `1.5px solid ${colorTheme}`, marginBottom: 16 }} />

      {/* Sections */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {visibleSections.some(s => s.type === 'summary') && summary && (
          <AtsSection title="SUMMARY" color={colorTheme}>
            <p style={{ margin: 0, fontSize: 10.5, color: '#222', lineHeight: 1.7 }}>{summary}</p>
          </AtsSection>
        )}

        {visibleSections.some(s => s.type === 'experience') && experience.length > 0 && (
          <AtsSection title="EXPERIENCE" color={colorTheme}>
            {experience.map((item, i) => (
              <div key={item.id} style={{ marginBottom: i < experience.length - 1 ? 13 : 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <div style={{ fontWeight: 700, fontSize: 11 }}>{item.position}</div>
                  <div style={{ fontSize: 10, color: '#333' }}>{item.start_date} – {item.is_current ? 'Present' : item.end_date}</div>
                </div>
                <div style={{ fontSize: 10.5, fontWeight: 600, color: '#333', marginTop: 1 }}>{item.company}</div>
                {item.description && (
                  <div style={{ fontSize: 10, color: '#222', marginTop: 5, lineHeight: 1.65 }}>{item.description}</div>
                )}
              </div>
            ))}
          </AtsSection>
        )}

        {visibleSections.some(s => s.type === 'education') && education.length > 0 && (
          <AtsSection title="EDUCATION" color={colorTheme}>
            {education.map((item, i) => (
              <div key={item.id} style={{ marginBottom: i < education.length - 1 ? 11 : 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <div style={{ fontWeight: 700, fontSize: 11 }}>{item.school}</div>
                  <div style={{ fontSize: 10, color: '#333' }}>{item.start_date} – {item.end_date}</div>
                </div>
                <div style={{ fontSize: 10.5, color: '#333', marginTop: 1 }}>
                  {[item.degree, item.field].filter(Boolean).join(', ')}{item.gpa ? ` | GPA: ${item.gpa}` : ''}
                </div>
              </div>
            ))}
          </AtsSection>
        )}

        {visibleSections.some(s => s.type === 'skills') && skills.length > 0 && (
          <AtsSection title="SKILLS" color={colorTheme}>
            <div style={{ fontSize: 10.5, color: '#222', lineHeight: 1.7 }}>
              {skills.map(s => s.name).join(' • ')}
            </div>
          </AtsSection>
        )}
      </div>
    </div>
  )
}

function AtsSection({ title, color, children }: { title: string; color: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color, borderBottom: `1px solid ${color}60`, paddingBottom: 3, marginBottom: 9 }}>{title}</div>
      {children}
    </div>
  )
}
