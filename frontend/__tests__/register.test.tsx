import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useRouter } from 'next/navigation'
import RegisterPage from '@/app/(auth)/register/page'
import { authApi } from '@/lib/api'
import { useAuthStore } from '@/store'
import { toast } from 'sonner'

vi.mock('next/navigation', () => ({ useRouter: vi.fn() }))
vi.mock('@/lib/api', () => ({
  authApi: { register: vi.fn(), googleRedirect: vi.fn() },
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

describe('RegisterPage', () => {
  it('render form đăng ký đủ các trường', () => {
    render(<RegisterPage />)
    expect(screen.getByLabelText('Họ và tên')).toBeInTheDocument()
    expect(screen.getByLabelText('Email')).toBeInTheDocument()
    expect(screen.getByLabelText('Mật khẩu')).toBeInTheDocument()
    expect(screen.getByLabelText('Xác nhận mật khẩu')).toBeInTheDocument()
  })

  it('báo lỗi khi mật khẩu không khớp', async () => {
    const user = userEvent.setup()
    render(<RegisterPage />)

    await user.type(screen.getByLabelText('Họ và tên'), 'Nguyễn Văn A')
    await user.type(screen.getByLabelText('Email'), 'a@example.com')
    await user.type(screen.getByLabelText('Mật khẩu'), 'Password1')
    await user.type(screen.getByLabelText('Xác nhận mật khẩu'), 'Password2')
    await user.click(screen.getByRole('button', { name: /Tạo tài khoản/i }))

    await waitFor(() => {
      expect(screen.getByText('Mật khẩu không khớp')).toBeInTheDocument()
    })
  })

  it('báo lỗi mật khẩu yếu (không có chữ hoa)', async () => {
    const user = userEvent.setup()
    render(<RegisterPage />)

    await user.type(screen.getByLabelText('Mật khẩu'), 'password1')
    await user.click(screen.getByRole('button', { name: /Tạo tài khoản/i }))

    await waitFor(() => {
      expect(screen.getByText('Phải có ít nhất 1 chữ hoa')).toBeInTheDocument()
    })
  })

  it('gọi authApi.register với đúng data', async () => {
    vi.mocked(authApi.register).mockResolvedValue({
      user: { id: '1', email: 'new@example.com', full_name: 'New User', avatar_url: null, created_at: '', updated_at: '' },
      subscription: { id: 's1', user_id: '1', plan: 'free', status: 'active', started_at: null, expires_at: null, updated_at: '' },
      access_token: 'tok',
      refresh_token: 'rtok',
    })

    const user = userEvent.setup()
    render(<RegisterPage />)

    await user.type(screen.getByLabelText('Họ và tên'), 'New User')
    await user.type(screen.getByLabelText('Email'), 'new@example.com')
    await user.type(screen.getByLabelText('Mật khẩu'), 'Password1')
    await user.type(screen.getByLabelText('Xác nhận mật khẩu'), 'Password1')
    await user.click(screen.getByRole('button', { name: /Tạo tài khoản/i }))

    await waitFor(() => {
      expect(authApi.register).toHaveBeenCalledWith({
        full_name: 'New User',
        email: 'new@example.com',
        password: 'Password1',
      })
      expect(mockSetAuth).toHaveBeenCalled()
      expect(mockPush).toHaveBeenCalledWith('/dashboard')
    })
  })

  it('hiển thị lỗi khi register thất bại', async () => {
    vi.mocked(authApi.register).mockRejectedValue(new Error('Conflict'))

    const user = userEvent.setup()
    render(<RegisterPage />)

    await user.type(screen.getByLabelText('Họ và tên'), 'New User')
    await user.type(screen.getByLabelText('Email'), 'new@example.com')
    await user.type(screen.getByLabelText('Mật khẩu'), 'Password1')
    await user.type(screen.getByLabelText('Xác nhận mật khẩu'), 'Password1')
    await user.click(screen.getByRole('button', { name: /Tạo tài khoản/i }))

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Email đã được sử dụng hoặc có lỗi xảy ra')
    })
  })
})
