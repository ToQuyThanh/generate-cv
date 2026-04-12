import { describe, it, expect, beforeEach } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { useAuthStore } from '@/store/authStore'

const mockAuthPayload = {
  user: {
    id: 'user-1',
    email: 'test@example.com',
    full_name: 'Nguyễn Văn Test',
    avatar_url: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
  subscription: {
    id: 'sub-1',
    user_id: 'user-1',
    plan: 'free' as const,
    status: 'active' as const,
    started_at: null,
    expires_at: null,
    updated_at: '2026-01-01T00:00:00Z',
  },
  access_token: 'mock-access-token',
  refresh_token: 'mock-refresh-token',
}

describe('useAuthStore', () => {
  beforeEach(() => {
    // Reset store về trạng thái ban đầu trước mỗi test
    useAuthStore.setState({
      user: null,
      subscription: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
    })
  })

  it('khởi tạo với trạng thái rỗng', () => {
    const { result } = renderHook(() => useAuthStore())
    expect(result.current.user).toBeNull()
    expect(result.current.isAuthenticated).toBe(false)
  })

  it('setAuth lưu user, subscription và token đúng', () => {
    const { result } = renderHook(() => useAuthStore())

    act(() => {
      result.current.setAuth(mockAuthPayload)
    })

    expect(result.current.isAuthenticated).toBe(true)
    expect(result.current.user?.email).toBe('test@example.com')
    expect(result.current.subscription?.plan).toBe('free')
    expect(result.current.accessToken).toBe('mock-access-token')
  })

  it('setUser cập nhật thông tin user', () => {
    const { result } = renderHook(() => useAuthStore())

    act(() => {
      result.current.setAuth(mockAuthPayload)
      result.current.setUser({ ...mockAuthPayload.user, full_name: 'Tên Mới' })
    })

    expect(result.current.user?.full_name).toBe('Tên Mới')
  })

  it('setSubscription cập nhật subscription', () => {
    const { result } = renderHook(() => useAuthStore())

    act(() => {
      result.current.setAuth(mockAuthPayload)
      result.current.setSubscription({
        ...mockAuthPayload.subscription,
        plan: 'monthly',
      })
    })

    expect(result.current.subscription?.plan).toBe('monthly')
  })

  it('clearAuth xóa toàn bộ state', () => {
    const { result } = renderHook(() => useAuthStore())

    act(() => {
      result.current.setAuth(mockAuthPayload)
      result.current.clearAuth()
    })

    expect(result.current.user).toBeNull()
    expect(result.current.isAuthenticated).toBe(false)
    expect(result.current.accessToken).toBeNull()
    expect(result.current.refreshToken).toBeNull()
  })
})
