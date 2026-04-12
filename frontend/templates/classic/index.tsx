/**
 * Template: Classic
 * Layout: Single-column, white background, tên căn giữa, accent color cho section title
 * Free template
 */

import type { TemplateProps } from '../types'
import {
  getPersonal, getSummary, getExperience, getEducation, getSkills, getVisibleSections,
} from '../types'

export function ClassicTemplate({ sections, colorTheme }: TemplateProps) {
  const personal = getPersonal(sections)
  const summary = getSummary(sections)
  const experience = getExperience(sections)
  const education = getEducation(sections)
  const skills = getSkills(sections)
  const visibleSections = getVisibleSections(sections)

  const contactItems = [
    personal.email,
    personal.phone,
    personal.location,
    personal.website,
  ].filter(Boolean) as string[]

  return (
    <div style={{
      width: 595,
      minHeight: 841,
      backgroundColor: '#ffffff',
      fontFamily: "'Georgia', 'Times New Roman', serif",
      fontSize: 11,
      color: '#1a1a1a',
      lineHeight: 1.6,
      padding: '40px 44px',
      boxSizing: 'border-box',
    }}>
      {/* ── Header — tên căn giữa ───────────────────────────────────────── */}
      <div style={{ textAlign: 'center', marginBottom: 24, borderBottom: `2px solid ${colorTheme}`, paddingBottom: 18 }}>
        <div style={{
          fontSize: 24,
          fontWeight: 700,
          color: colorTheme,
          letterSpacing: '0.03em',
          marginBottom: 4,
        }}>
          {personal.full_name || 'Họ và tên'}
        </div>
        {personal.job_title && (
          <div style={{ fontSize: 12, color: '#555', fontStyle: 'italic', marginBottom: 10 }}>
            {personal.job_title}
          </div>
        )}
        {contactItems.length > 0 && (
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            flexWrap: 'wrap',
            gap: '4px 16px',
            fontSize: 10,
            color: '#444',
          }}>
            {contactItems.map((item, i) => (
              <span key={i}>{item}</span>
            ))}
          </div>
        )}
        {(personal.linkedin || personal.github) && (
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            gap: 16,
            fontSize: 10,
            color: '#666',
            marginTop: 4,
          }}>
            {personal.linkedin && <span>LinkedIn: {personal.linkedin}</span>}
            {personal.github && <span>GitHub: {personal.github}</span>}
          </div>
        )}
      </div>

      {/* ── Body ───────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Summary */}
        {visibleSections.some((s) => s.type === 'summary') && summary && (
          <ClassicSection title="Mục tiêu nghề nghiệp" color={colorTheme}>
            <p style={{ margin: 0, fontSize: 10.5, color: '#333', lineHeight: 1.7, fontStyle: 'italic' }}>
              {summary}
            </p>
          </ClassicSection>
        )}

        {/* Experience */}
        {visibleSections.some((s) => s.type === 'experience') && experience.length > 0 && (
          <ClassicSection title="Kinh nghiệm làm việc" color={colorTheme}>
            {experience.map((item, i) => (
              <div key={item.id} style={{ marginBottom: i < experience.length - 1 ? 14 : 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <div style={{ fontWeight: 700, fontSize: 11, color: '#111' }}>{item.position}</div>
                  <div style={{ fontSize: 10, color: '#777', fontStyle: 'italic' }}>
                    {item.start_date} – {item.is_current ? 'Hiện tại' : item.end_date}
                  </div>
                </div>
                <div style={{ fontSize: 10.5, color: colorTheme, fontWeight: 600, marginTop: 1 }}>
                  {item.company}
                </div>
                {item.description && (
                  <div style={{ fontSize: 10, color: '#444', marginTop: 5, lineHeight: 1.65 }}>
                    {item.description}
                  </div>
                )}
              </div>
            ))}
          </ClassicSection>
        )}

        {/* Education */}
        {visibleSections.some((s) => s.type === 'education') && education.length > 0 && (
          <ClassicSection title="Học vấn" color={colorTheme}>
            {education.map((item, i) => (
              <div key={item.id} style={{ marginBottom: i < education.length - 1 ? 12 : 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <div style={{ fontWeight: 700, fontSize: 11, color: '#111' }}>{item.school}</div>
                  <div style={{ fontSize: 10, color: '#777', fontStyle: 'italic' }}>
                    {item.start_date} – {item.end_date}
                  </div>
                </div>
                <div style={{ fontSize: 10.5, color: colorTheme, fontWeight: 600 }}>
                  {[item.degree, item.field].filter(Boolean).join(', ')}
                </div>
                {item.gpa && (
                  <div style={{ fontSize: 10, color: '#555', marginTop: 2 }}>GPA: {item.gpa}</div>
                )}
              </div>
            ))}
          </ClassicSection>
        )}

        {/* Skills */}
        {visibleSections.some((s) => s.type === 'skills') && skills.length > 0 && (
          <ClassicSection title="Kỹ năng" color={colorTheme}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              {skills.map((skill) => (
                <div key={skill.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 10.5, color: '#222', minWidth: 120 }}>{skill.name}</span>
                  {/* Dot level indicator */}
                  <div style={{ display: 'flex', gap: 3 }}>
                    {[1, 2, 3, 4, 5].map((dot) => (
                      <div key={dot} style={{
                        width: 7,
                        height: 7,
                        borderRadius: '50%',
                        backgroundColor: dot <= skill.level ? colorTheme : '#E5E7EB',
                      }} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </ClassicSection>
        )}
      </div>
    </div>
  )
}

function ClassicSection({ title, color, children }: { title: string; color: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{
        fontSize: 12,
        fontWeight: 700,
        color,
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
        marginBottom: 6,
        paddingBottom: 4,
        borderBottom: `1px solid ${color}40`,
      }}>
        {title}
      </div>
      {children}
    </div>
  )
}
