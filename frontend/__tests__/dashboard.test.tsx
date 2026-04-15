import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useRouter } from 'next/navigation'
import DashboardPage from '@/app/(dashboard)/dashboard/page'
import { cvApi } from '@/lib/api'
import type { CVListItem } from '@/types'

vi.mock('next/navigation', () => ({ useRouter: vi.fn() }))
vi.mock('@/store', () => ({
  useAuthStore: vi.fn(() => ({
    user: { id: '1', email: 't@e.com', full_name: 'Nguyễn Văn An', avatar_url: null, created_at: '', updated_at: '' },
    subscription: { id: 's1', user_id: '1', plan: 'free', status: 'active', started_at: null, expires_at: null, updated_at: '' },
  })),
}))
vi.mock('@/lib/api', () => ({
  cvApi: {
    list: vi.fn(),
    create: vi.fn(),
    duplicate: vi.fn(),
    delete: vi.fn(),
  },
}))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

const mockCVs: CVListItem[] = [
  { id: 'cv-1', title: 'CV Frontend Dev', template_id: 'template_modern_01', color_theme: '#1a56db', sections: [], created_at: '2026-04-01T00:00:00Z', updated_at: '2026-04-10T00:00:00Z' },
  { id: 'cv-2', title: 'CV Backend Dev', template_id: 'template_classic_01', color_theme: '#0f9f6e', sections: [], created_at: '2026-03-20T00:00:00Z', updated_at: '2026-04-05T00:00:00Z' },
]

const mockPush = vi.fn()
beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(useRouter).mockReturnValue({ push: mockPush } as ReturnType<typeof useRouter>)
})

describe('DashboardPage', () => {
  it('hiển thị loading spinner ban đầu', () => {
    vi.mocked(cvApi.list).mockReturnValue(new Promise(() => {})) // never resolves
    render(<DashboardPage />)
    expect(document.querySelector('.animate-spin')).toBeInTheDocument()
  })

  it('hiển thị danh sách CV sau khi load', async () => {
    vi.mocked(cvApi.list).mockResolvedValue({ data: mockCVs, total: 2, page: 1, per_page: 12, total_pages: 1 })

    render(<DashboardPage />)

    await waitFor(() => {
      expect(screen.getByText('CV Frontend Dev')).toBeInTheDocument()
      expect(screen.getByText('CV Backend Dev')).toBeInTheDocument()
    })
  })

  it('hiển thị empty state khi không có CV', async () => {
    vi.mocked(cvApi.list).mockResolvedValue({ data: [], total: 0, page: 1, per_page: 12, total_pages: 0 })

    render(<DashboardPage />)

    await waitFor(() => {
      expect(screen.getByText('Chưa có CV nào')).toBeInTheDocument()
    })
  })

  it('hiển thị tên user trong lời chào', async () => {
    vi.mocked(cvApi.list).mockResolvedValue({ data: [], total: 0, page: 1, per_page: 12, total_pages: 0 })

    render(<DashboardPage />)

    await waitFor(() => {
      expect(screen.getByText(/Xin chào, An/)).toBeInTheDocument()
    })
  })

  it('navigate đến /cv/new khi click "Tạo CV mới"', async () => {
    vi.mocked(cvApi.list).mockResolvedValue({ data: mockCVs, total: 2, page: 1, per_page: 12, total_pages: 1 })

    const user = userEvent.setup()
    render(<DashboardPage />)

    await waitFor(() => screen.getByText('CV Frontend Dev'))
    await user.click(screen.getByRole('button', { name: /Tạo CV mới/i }))

    expect(mockPush).toHaveBeenCalledWith('/cv/new')
  })

  it('navigate đến /cv/new khi click "Tạo CV đầu tiên" ở empty state', async () => {
    vi.mocked(cvApi.list).mockResolvedValue({ data: [], total: 0, page: 1, per_page: 12, total_pages: 0 })

    const user = userEvent.setup()
    render(<DashboardPage />)

    await waitFor(() => screen.getByText('Chưa có CV nào'))
    await user.click(screen.getByRole('button', { name: /Tạo CV đầu tiên/i }))

    expect(mockPush).toHaveBeenCalledWith('/cv/new')
  })
})
