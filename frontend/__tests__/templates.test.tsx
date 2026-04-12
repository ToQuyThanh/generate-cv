import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ModernTemplate } from '@/templates/modern'
import { ClassicTemplate } from '@/templates/classic'
import { MinimalTemplate } from '@/templates/minimal'
import { SidebarTemplate } from '@/templates/sidebar'
import type { CVSection } from '@/types'

// ─── Sample data dùng chung ───────────────────────────────────────────────────

const SECTIONS: CVSection[] = [
  {
    id: 's-personal',
    type: 'personal',
    title: 'Thông tin cá nhân',
    visible: true,
    order: 0,
    data: {
      full_name: 'Trần Thị B',
      job_title: 'Product Manager',
      email: 'b@example.com',
      phone: '0987654321',
      location: 'TP.HCM',
      website: 'https://b.dev',
      linkedin: 'linkedin.com/in/b',
      github: 'github.com/b',
      avatar_url: '',
    },
  },
  {
    id: 's-summary',
    type: 'summary',
    title: 'Giới thiệu',
    visible: true,
    order: 1,
    data: { content: 'Tôi là PM với 5 năm kinh nghiệm trong lĩnh vực fintech.' },
  },
  {
    id: 's-experience',
    type: 'experience',
    title: 'Kinh nghiệm',
    visible: true,
    order: 2,
    data: {
      items: [
        {
          id: 'exp-1',
          company: 'Công ty A',
          position: 'Senior PM',
          start_date: '01/2022',
          end_date: '',
          is_current: true,
          description: 'Quản lý roadmap sản phẩm và dẫn dắt team 10 người.',
        },
      ],
    },
  },
  {
    id: 's-education',
    type: 'education',
    title: 'Học vấn',
    visible: true,
    order: 3,
    data: {
      items: [
        {
          id: 'edu-1',
          school: 'Đại học Bách Khoa HCM',
          degree: 'Kỹ sư',
          field: 'Công nghệ thông tin',
          start_date: '2014',
          end_date: '2018',
          gpa: '3.6',
        },
      ],
    },
  },
  {
    id: 's-skills',
    type: 'skills',
    title: 'Kỹ năng',
    visible: true,
    order: 4,
    data: {
      items: [
        { id: 'sk-1', name: 'Agile/Scrum', level: 5 },
        { id: 'sk-2', name: 'SQL', level: 3 },
      ],
    },
  },
]

const COLOR = '#4f46e5'

// ─── Helper ───────────────────────────────────────────────────────────────────

const sharedTests = (
  TemplateName: string,
  Component: React.ComponentType<{ sections: CVSection[]; colorTheme: string }>
) => {
  describe(TemplateName, () => {
    it('render tên ứng viên', () => {
      render(<Component sections={SECTIONS} colorTheme={COLOR} />)
      expect(screen.getByText('Trần Thị B')).toBeInTheDocument()
    })

    it('render job title', () => {
      render(<Component sections={SECTIONS} colorTheme={COLOR} />)
      expect(screen.getByText('Product Manager')).toBeInTheDocument()
    })

    it('render summary', () => {
      render(<Component sections={SECTIONS} colorTheme={COLOR} />)
      expect(screen.getByText(/PM với 5 năm kinh nghiệm/)).toBeInTheDocument()
    })

    it('render tên công ty và vị trí', () => {
      render(<Component sections={SECTIONS} colorTheme={COLOR} />)
      expect(screen.getByText('Công ty A')).toBeInTheDocument()
      expect(screen.getByText('Senior PM')).toBeInTheDocument()
    })

    it('render trường đại học', () => {
      render(<Component sections={SECTIONS} colorTheme={COLOR} />)
      expect(screen.getByText('Đại học Bách Khoa HCM')).toBeInTheDocument()
    })

    it('render kỹ năng', () => {
      render(<Component sections={SECTIONS} colorTheme={COLOR} />)
      expect(screen.getByText('Agile/Scrum')).toBeInTheDocument()
    })

    it('không hiển thị section bị ẩn', () => {
      const sectionsWithHidden: CVSection[] = SECTIONS.map((s) =>
        s.type === 'education' ? { ...s, visible: false } : s
      )
      render(<Component sections={sectionsWithHidden} colorTheme={COLOR} />)
      expect(screen.queryByText('Đại học Bách Khoa HCM')).not.toBeInTheDocument()
    })

    it('render placeholder khi sections rỗng', () => {
      render(<Component sections={[]} colorTheme={COLOR} />)
      // Không crash — ít nhất render được DOM
      expect(document.body).toBeTruthy()
    })
  })
}

// ─── Chạy shared tests cho mỗi template ─────────────────────────────────────

sharedTests('ModernTemplate', ModernTemplate)
sharedTests('ClassicTemplate', ClassicTemplate)
sharedTests('MinimalTemplate', MinimalTemplate)
sharedTests('SidebarTemplate', SidebarTemplate)

// ─── Template-specific tests ─────────────────────────────────────────────────

describe('SidebarTemplate — specific', () => {
  it('hiển thị initials từ tên ứng viên', () => {
    render(<SidebarTemplate sections={SECTIONS} colorTheme={COLOR} />)
    // "Trần Thị B" → initials "TB"
    expect(screen.getByText('TB')).toBeInTheDocument()
  })

  it('hiển thị initials fallback "CV" khi không có tên', () => {
    const noName = SECTIONS.map((s) =>
      s.type === 'personal' ? { ...s, data: { ...s.data, full_name: '' } } : s
    )
    render(<SidebarTemplate sections={noName} colorTheme={COLOR} />)
    expect(screen.getByText('CV')).toBeInTheDocument()
  })
})

describe('ClassicTemplate — specific', () => {
  it('hiển thị dot level indicator cho skills', () => {
    const { container } = render(<ClassicTemplate sections={SECTIONS} colorTheme={COLOR} />)
    // 5 dots × 2 skills = 10 divs với border-radius 50%
    const dots = container.querySelectorAll('[style*="border-radius: 50%"]')
    expect(dots.length).toBeGreaterThanOrEqual(10)
  })
})

describe('MinimalTemplate — specific', () => {
  it('hiển thị progress bar kỹ năng', () => {
    const { container } = render(<MinimalTemplate sections={SECTIONS} colorTheme={COLOR} />)
    // Progress bar container: height 3px
    const bars = container.querySelectorAll('[style*="height: 3px"]')
    expect(bars.length).toBeGreaterThanOrEqual(2)
  })
})
