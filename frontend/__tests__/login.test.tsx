import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useRouter } from 'next/navigation'
import LoginPage from '@/app/(auth)/login/page'
import { authApi } from '@/lib/api'
import { useAuthStore } from '@/store'
import { toast } from 'sonner'

vi.mock('next/navigation', () => ({ useRouter: vi.fn() }))
vi.mock('@/lib/api', () => ({
  authApi: { login: vi.fn(), googleRedirect: vi.fn() },
}))
vi.mock('@/store', () => ({ useAuthStore: vi.fn() }))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

const mockPush = vi.fn()
const mockSetAuth = vi.fn()

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(useRouter).mockReturnValue({ push: mockPush } as ReturnType<typeof useRouter>)
  // Support selector pattern: useAuthStore((s) => s.setAuth)
  vi.mocked(useAuthStore).mockImplementation((selector?: (s: unknown) => unknown) => {
    const store = { setAuth: mockSetAuth }
    return selector ? selector(store) : store
  })
})

describe('LoginPage', () => {
  it('render form đăng nhập', () => {
    render(<LoginPage />)
    expect(screen.getByLabelText('Email')).toBeInTheDocument()
    expect(screen.getByLabelText('Mật khẩu')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Đăng nhập/i })).toBeInTheDocument()
  })

  it('hiển thị lỗi validation khi form trống', async () => {
    const user = userEvent.setup()
    render(<LoginPage />)

    await user.click(screen.getByRole('button', { name: /Đăng nhập/i }))

    await waitFor(() => {
      expect(screen.getByText('Email không hợp lệ')).toBeInTheDocument()
      expect(screen.getByText('Mật khẩu ít nhất 6 ký tự')).toBeInTheDocument()
    })
  })

  it('hiển thị lỗi khi email sai định dạng', async () => {
    const user = userEvent.setup()
    render(<LoginPage />)

    await user.type(screen.getByLabelText('Email'), 'not-an-email')
    await user.click(screen.getByRole('button', { name: /Đăng nhập/i }))

    await waitFor(() => {
      expect(screen.getByText('Email không hợp lệ')).toBeInTheDocument()
    })
  })

  it('gọi authApi.login với đúng data khi submit', async () => {
    vi.mocked(authApi.login).mockResolvedValue({
      user: { id: '1', email: 'test@example.com', full_name: 'Test', avatar_url: null, created_at: '', updated_at: '' },
      subscription: { id: 's1', user_id: '1', plan: 'free', status: 'active', started_at: null, expires_at: null, updated_at: '' },
      access_token: 'tok',
      refresh_token: 'rtok',
    })

    const user = userEvent.setup()
    render(<LoginPage />)

    await user.type(screen.getByLabelText('Email'), 'test@example.com')
    await user.type(screen.getByLabelText('Mật khẩu'), 'password123')
    await user.click(screen.getByRole('button', { name: /Đăng nhập/i }))

    await waitFor(() => {
      expect(authApi.login).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      })
      expect(mockSetAuth).toHaveBeenCalled()
      expect(mockPush).toHaveBeenCalledWith('/dashboard')
    })
  })

  it('hiển thị lỗi khi login thất bại', async () => {
    vi.mocked(authApi.login).mockRejectedValue(new Error('Unauthorized'))

    const user = userEvent.setup()
    render(<LoginPage />)

    await user.type(screen.getByLabelText('Email'), 'test@example.com')
    await user.type(screen.getByLabelText('Mật khẩu'), 'wrongpass')
    await user.click(screen.getByRole('button', { name: /Đăng nhập/i }))

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Email hoặc mật khẩu không đúng')
    })
  })

  it('có link đến trang đăng ký', () => {
    render(<LoginPage />)
    expect(screen.getByRole('link', { name: /Đăng ký miễn phí/i })).toHaveAttribute('href', '/register')
  })

  it('có nút đăng nhập Google', () => {
    render(<LoginPage />)
    expect(screen.getByRole('button', { name: /Google/i })).toBeInTheDocument()
  })
})
