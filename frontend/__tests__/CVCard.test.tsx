import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useRouter } from 'next/navigation'
import { CVCard } from '@/components/cv/CVCard'
import type { CVListItem } from '@/types'

vi.mock('next/navigation', () => ({ useRouter: vi.fn() }))

// Mock CVMiniPreview để tránh render template phức tạp trong test
vi.mock('@/components/cv/CVMiniPreview', () => ({
  CVMiniPreview: () => null,
}))

// Mock cvApi.update cho inline rename
vi.mock('@/lib/api', () => ({
  cvApi: {
    update: vi.fn().mockResolvedValue({}),
  },
}))

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

const mockCV: CVListItem = {
  id: 'cv-1',
  title: 'CV Frontend Dev',
  template_id: 'template_modern_01',
  color_theme: '#1a56db',
  sections: [],                          // bắt buộc sau khi update CVListItem type
  created_at: '2026-04-01T00:00:00Z',
  updated_at: new Date().toISOString(),
}

const mockPush = vi.fn()

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(useRouter).mockReturnValue({ push: mockPush } as ReturnType<typeof useRouter>)
})

// Helper: lấy nút trigger dropdown (aria-label="Tuỳ chọn")
function getMenuTrigger() {
  return screen.getByRole('button', { name: 'Tuỳ chọn' })
}

describe('CVCard', () => {
  it('hiển thị title CV', () => {
    render(<CVCard cv={mockCV} onDuplicate={vi.fn()} onDelete={vi.fn()} />)
    expect(screen.getByText('CV Frontend Dev')).toBeInTheDocument()
  })

  it('hiển thị thời gian cập nhật', () => {
    render(<CVCard cv={mockCV} onDuplicate={vi.fn()} onDelete={vi.fn()} />)
    expect(screen.getByText('Hôm nay')).toBeInTheDocument()
  })

  it('mở dropdown khi click menu button', async () => {
    const user = userEvent.setup()
    render(<CVCard cv={mockCV} onDuplicate={vi.fn()} onDelete={vi.fn()} />)

    // aria-label thực tế là "Tuỳ chọn" (không phải "more options")
    await user.click(getMenuTrigger())

    await waitFor(() => {
      expect(screen.getByText('Chỉnh sửa')).toBeInTheDocument()
      expect(screen.getByText('Nhân đôi')).toBeInTheDocument()
      expect(screen.getByText('Xóa')).toBeInTheDocument()
    })
  })

  it('navigate đến editor khi click vào thumbnail', async () => {
    const user = userEvent.setup()
    render(<CVCard cv={mockCV} onDuplicate={vi.fn()} onDelete={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: /Mở CV/ }))

    expect(mockPush).toHaveBeenCalledWith('/cv/cv-1')
  })

  it('gọi onDuplicate khi click Nhân đôi', async () => {
    const onDuplicate = vi.fn()
    const user = userEvent.setup()
    render(<CVCard cv={mockCV} onDuplicate={onDuplicate} onDelete={vi.fn()} />)

    await user.click(getMenuTrigger())
    await waitFor(() => screen.getByText('Nhân đôi'))
    await user.click(screen.getByText('Nhân đôi'))

    expect(onDuplicate).toHaveBeenCalledWith('cv-1')
  })

  it('yêu cầu xác nhận trước khi xóa (2 lần click)', async () => {
    const onDelete = vi.fn()
    const user = userEvent.setup()
    render(<CVCard cv={mockCV} onDuplicate={vi.fn()} onDelete={onDelete} />)

    // Lần 1: mở dropdown → click Xóa → dropdown đóng, state confirming=true
    await user.click(getMenuTrigger())
    await waitFor(() => screen.getByText('Xóa'))
    await user.click(screen.getByText('Xóa'))

    // onDelete chưa được gọi
    expect(onDelete).not.toHaveBeenCalled()

    // Lần 2: mở lại dropdown → item giờ là "Nhấn lại để xác nhận"
    await user.click(getMenuTrigger())
    await waitFor(() => screen.getByText('Nhấn lại để xác nhận'))
    await user.click(screen.getByText('Nhấn lại để xác nhận'))

    expect(onDelete).toHaveBeenCalledWith('cv-1')
  })

  it('hiển thị "Đổi tên" trong dropdown', async () => {
    const user = userEvent.setup()
    render(<CVCard cv={mockCV} onDuplicate={vi.fn()} onDelete={vi.fn()} />)

    await user.click(getMenuTrigger())

    await waitFor(() => {
      expect(screen.getByText('Đổi tên')).toBeInTheDocument()
    })
  })
})
