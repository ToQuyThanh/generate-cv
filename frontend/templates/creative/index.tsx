/**
 * Template: Creative
 * Layout: Two-column — sidebar trái tối (40%) với gradient, main phải sáng (60%)
 * Free template
 */
import type { TemplateProps } from '../types'
import { getPersonal, getSummary, getExperience, getEducation, getSkills, getVisibleSections } from '../types'

function hexToRgb(hex: string) {
  const n = parseInt(hex.replace('#', ''), 16)
  return { r: (n >> 16) & 0xff, g: (n >> 8) & 0xff, b: n & 0xff }
}
function darken(hex: string, amt: number) {
  const { r, g, b } = hexToRgb(hex)
  const d = (v: number) => Math.max(0, Math.round(v * (1 - amt))).toString(16).padStart(2, '0')
  return `#${d(r)}${d(g)}${d(b)}`
}

export function CreativeTemplate({ sections, colorTheme }: TemplateProps) {
  const personal = getPersonal(sections)
  const summary = getSummary(sections)
  const experience = getExperience(sections)
  const education = getEducation(sections)
  const skills = getSkills(sections)
  const visibleSections = getVisibleSections(sections)
  const dark = darken(colorTheme, 0.35)

  return (
    <div style={{ width: 595, minHeight: 841, backgroundColor: '#fff', fontFamily: "'Inter', 'Helvetica Neue', Arial, sans-serif", fontSize: 11, color: '#1F2937', lineHeight: 1.5, display: 'flex' }}>

      {/* ── Sidebar trái ─────────────────────────────────────────── */}
      <div style={{ width: 220, minHeight: 841, background: `linear-gradient(160deg, ${colorTheme} 0%, ${dark} 100%)`, padding: '32px 18px', display: 'flex', flexDirection: 'column', gap: 22, flexShrink: 0 }}>
        {/* Avatar initials */}
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 68, height: 68, borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.15)', border: '2px solid rgba(255,255,255,0.4)', margin: '0 auto 12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 700, color: '#fff' }}>
            {personal.full_name ? personal.full_name.split(' ').slice(-2).map((w: string) => w[0]).join('').toUpperCase() : 'CV'}
          </div>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', lineHeight: 1.25 }}>{personal.full_name || 'Họ và tên'}</div>
          {personal.job_title && (
            <div style={{ fontSize: 9.5, color: 'rgba(255,255,255,0.7)', marginTop: 5, letterSpacing: '0.04em' }}>{personal.job_title}</div>
          )}
        </div>

        <div style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.2)' }} />

        {/* Contact */}
        <CreativeSideSection title="Liên hệ">
          {[
            { label: '✉', val: personal.email },
            { label: '✆', val: personal.phone },
            { label: '⊙', val: personal.location },
            { label: '⊕', val: personal.website },
            { label: 'in', val: personal.linkedin },
            { label: '⌥', val: personal.github },
          ].filter(r => r.val).map((r, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 6 }}>
              <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.5)', width: 12, flexShrink: 0, marginTop: 1 }}>{r.label}</span>
              <span style={{ fontSize: 9.5, color: 'rgba(255,255,255,0.85)', wordBreak: 'break-all', lineHeight: 1.4 }}>{r.val}</span>
            </div>
          ))}
        </CreativeSideSection>

        {/* Skills */}
        {visibleSections.some(s => s.type === 'skills') && skills.length > 0 && (
          <CreativeSideSection title="Kỹ năng">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
              {skills.map(skill => (
                <span key={skill.id} style={{ fontSize: 9, padding: '3px 8px', borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.15)', color: '#fff', border: '1px solid rgba(255,255,255,0.25)' }}>
                  {skill.name}
                </span>
              ))}
            </div>
          </CreativeSideSection>
        )}

        {/* Education in sidebar */}
        {visibleSections.some(s => s.type === 'education') && education.length > 0 && (
          <CreativeSideSection title="Học vấn">
            {education.map((item, i) => (
              <div key={item.id} style={{ marginBottom: i < education.length - 1 ? 10 : 0 }}>
                <div style={{ fontSize: 9.5, fontWeight: 700, color: '#fff' }}>{item.school}</div>
                <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.7)', marginTop: 2 }}>{[item.degree, item.field].filter(Boolean).join(', ')}</div>
                <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.5)', marginTop: 1 }}>{item.start_date} – {item.end_date}</div>
              </div>
            ))}
          </CreativeSideSection>
        )}
      </div>

      {/* ── Main phải ────────────────────────────────────────────── */}
      <div style={{ flex: 1, padding: '28px 24px', display: 'flex', flexDirection: 'column', gap: 20 }}>
        {visibleSections.some(s => s.type === 'summary') && summary && (
          <CreativeMainSection title="Về tôi" color={colorTheme}>
            <p style={{ margin: 0, fontSize: 10.5, color: '#374151', lineHeight: 1.75 }}>{summary}</p>
          </CreativeMainSection>
        )}

        {visibleSections.some(s => s.type === 'experience') && experience.length > 0 && (
          <CreativeMainSection title="Kinh nghiệm" color={colorTheme}>
            {experience.map((item, i) => (
              <div key={item.id} style={{ marginBottom: i < experience.length - 1 ? 15 : 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 11, color: '#0f172a' }}>{item.position}</div>
                    <div style={{ fontSize: 10, color: colorTheme, fontWeight: 600, marginTop: 1 }}>{item.company}</div>
                  </div>
                  <span style={{ fontSize: 8.5, backgroundColor: colorTheme + '18', color: colorTheme, padding: '2px 8px', borderRadius: 999, whiteSpace: 'nowrap', marginTop: 2 }}>
                    {item.start_date} – {item.is_current ? 'Nay' : item.end_date}
                  </span>
                </div>
                {item.description && (
                  <div style={{ fontSize: 10, color: '#4B5563', marginTop: 5, lineHeight: 1.65 }}>{item.description}</div>
                )}
              </div>
            ))}
          </CreativeMainSection>
        )}
      </div>
    </div>
  )
}

function CreativeSideSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: 8, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.14em', color: 'rgba(255,255,255,0.5)', marginBottom: 8 }}>{title}</div>
      {children}
    </div>
  )
}
function CreativeMainSection({ title, color, children }: { title: string; color: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <div style={{ width: 4, height: 16, backgroundColor: color, borderRadius: 2 }} />
        <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.08em', color }}>{title}</div>
      </div>
      {children}
    </div>
  )
}
