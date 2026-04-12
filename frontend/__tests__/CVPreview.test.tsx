import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { act } from '@testing-library/react'
import { CVPreview } from '@/components/editor/CVPreview'
import { useEditorStore } from '@/store/editorStore'
import type { CV } from '@/types'

const mockCV: CV = {
  id: 'cv-1',
  user_id: 'user-1',
  title: 'CV Test',
  template_id: 'template_modern_01',
  color_theme: '#1a56db',
  sections: [
    {
      id: 's-personal',
      type: 'personal',
      title: 'Thông tin cá nhân',
      visible: true,
      order: 0,
      data: {
        full_name: 'Nguyễn Văn A',
        job_title: 'Frontend Developer',
        email: 'test@example.com',
        phone: '0912345678',
        location: 'Hà Nội',
        website: '',
        linkedin: '',
        github: '',
        avatar_url: '',
      },
    },
    {
      id: 's-summary',
      type: 'summary',
      title: 'Giới thiệu',
      visible: true,
      order: 1,
      data: { content: 'Kỹ sư phần mềm 3 năm kinh nghiệm' },
    },
    {
      id: 's-skills',
      type: 'skills',
      title: 'Kỹ năng',
      visible: true,
      order: 2,
      data: {
        items: [
          { id: 'sk-1', name: 'React', level: 4 },
          { id: 'sk-2', name: 'TypeScript', level: 3 },
        ],
      },
    },
    {
      id: 's-hidden',
      type: 'education',
      title: 'Học vấn',
      visible: false, // ẩn — không nên render
      order: 3,
      data: { items: [] },
    },
  ],
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
}

describe('CVPreview', () => {
  beforeEach(() => {
    act(() => useEditorStore.getState().reset())
  })

  it('render null khi chưa có cvData', () => {
    const { container } = render(<CVPreview />)
    expect(container.firstChild).toBeNull()
  })

  it('render tên và job title từ personal section', () => {
    act(() => useEditorStore.getState().setCVData(mockCV))
    render(<CVPreview />)
    expect(screen.getByText('Nguyễn Văn A')).toBeInTheDocument()
    expect(screen.getByText('Frontend Developer')).toBeInTheDocument()
  })

  it('render summary content', () => {
    act(() => useEditorStore.getState().setCVData(mockCV))
    render(<CVPreview />)
    expect(screen.getByText('Kỹ sư phần mềm 3 năm kinh nghiệm')).toBeInTheDocument()
  })

  it('render skills', () => {
    act(() => useEditorStore.getState().setCVData(mockCV))
    render(<CVPreview />)
    expect(screen.getByText(/React/)).toBeInTheDocument()
    expect(screen.getByText(/TypeScript/)).toBeInTheDocument()
  })

  it('không render section bị ẩn (visible: false)', () => {
    act(() => useEditorStore.getState().setCVData(mockCV))
    render(<CVPreview />)
    // Section 'Học vấn' visible=false không được render
    expect(screen.queryByText('Học vấn')).not.toBeInTheDocument()
  })

  it('cập nhật preview real-time khi updateSection', () => {
    act(() => useEditorStore.getState().setCVData(mockCV))
    render(<CVPreview />)
    act(() =>
      useEditorStore.getState().updateSection('s-summary', {
        data: { content: 'Nội dung mới được cập nhật' },
      })
    )
    expect(screen.getByText('Nội dung mới được cập nhật')).toBeInTheDocument()
  })
})
