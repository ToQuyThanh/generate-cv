import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { act } from '@testing-library/react'
import { CVPreview } from '@/components/editor/CVPreview'
import { useEditorStore } from '@/store/editorStore'
import type { CV } from '@/types'

const BASE_CV: CV = {
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
      visible: false,
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
    act(() => useEditorStore.getState().setCVData(BASE_CV))
    render(<CVPreview />)
    expect(screen.getByText('Nguyễn Văn A')).toBeInTheDocument()
    expect(screen.getByText('Frontend Developer')).toBeInTheDocument()
  })

  it('render summary content', () => {
    act(() => useEditorStore.getState().setCVData(BASE_CV))
    render(<CVPreview />)
    expect(screen.getByText('Kỹ sư phần mềm 3 năm kinh nghiệm')).toBeInTheDocument()
  })

  it('render skills', () => {
    act(() => useEditorStore.getState().setCVData(BASE_CV))
    render(<CVPreview />)
    expect(screen.getByText(/React/)).toBeInTheDocument()
    expect(screen.getByText(/TypeScript/)).toBeInTheDocument()
  })

  it('không render section bị ẩn (visible: false)', () => {
    act(() => useEditorStore.getState().setCVData(BASE_CV))
    render(<CVPreview />)
    expect(screen.queryByText('Học vấn')).not.toBeInTheDocument()
  })

  it('cập nhật preview real-time khi updateSection', () => {
    act(() => useEditorStore.getState().setCVData(BASE_CV))
    render(<CVPreview />)
    act(() =>
      useEditorStore.getState().updateSection('s-summary', {
        data: { content: 'Nội dung mới được cập nhật' },
      })
    )
    expect(screen.getByText('Nội dung mới được cập nhật')).toBeInTheDocument()
  })

  it('render đúng với template Classic khi template_id thay đổi', () => {
    const classicCV: CV = { ...BASE_CV, template_id: 'template_classic_01', color_theme: '#1e3a5f' }
    act(() => useEditorStore.getState().setCVData(classicCV))
    render(<CVPreview />)
    // Classic vẫn render tên ứng viên
    expect(screen.getByText('Nguyễn Văn A')).toBeInTheDocument()
  })

  it('render đúng với template Sidebar khi template_id thay đổi', () => {
    const sidebarCV: CV = { ...BASE_CV, template_id: 'template_sidebar_01', color_theme: '#4f46e5' }
    act(() => useEditorStore.getState().setCVData(sidebarCV))
    render(<CVPreview />)
    // Sidebar hiển thị initials "NA" (Nguyễn Văn A → lấy 2 từ cuối: Văn A → VA)
    expect(screen.getByText('VA')).toBeInTheDocument()
  })

  it('fallback về Modern khi template_id không hợp lệ', () => {
    const unknownTplCV: CV = { ...BASE_CV, template_id: 'template_khong_co' }
    act(() => useEditorStore.getState().setCVData(unknownTplCV))
    render(<CVPreview />)
    // Modern vẫn render tên
    expect(screen.getByText('Nguyễn Văn A')).toBeInTheDocument()
  })
})
