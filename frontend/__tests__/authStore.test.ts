import { describe, it, expect, beforeEach } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { useAuthStore } from '@/store/authStore'

// Backend AuthResponse KHÔNG có subscription — chỉ có user + tokens
const mockAuthPayload = {
  user: {
    id: 'user-1',
    email: 'test@example.com',
    full_name: 'Nguyễn Văn Test',
    avatar_url: null,
    created_at: '2026-01-01T00:00:00Z',
  },
  access_token: 'mock-access-token',
  refresh_token: 'mock-refresh-token',
}

const mockSubscription = {
  id: 'sub-1',
  plan: 'free' as const,
  status: 'active' as const,
  started_at: null,
  expires_at: null,
  updated_at: '2026-01-01T00:00:00Z',
}

describe('useAuthStore', () => {
  beforeEach(() => {
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
    expect(result.current.subscription).toBeNull()
  })

  it('setAuth lưu user và tokens, subscription vẫn null', () => {
    const { result } = renderHook(() => useAuthStore())
    act(() => { result.current.setAuth(mockAuthPayload) })
    expect(result.current.isAuthenticated).toBe(true)
    expect(result.current.user?.email).toBe('test@example.com')
    expect(result.current.accessToken).toBe('mock-access-token')
    expect(result.current.refreshToken).toBe('mock-refresh-token')
    // subscription chưa được set — phải gọi setSubscription riêng
    expect(result.current.subscription).toBeNull()
  })

  it('setSubscription set subscription sau khi setAuth', () => {
    const { result } = renderHook(() => useAuthStore())
    act(() => {
      result.current.setAuth(mockAuthPayload)
      result.current.setSubscription(mockSubscription)
    })
    expect(result.current.subscription?.plan).toBe('free')
  })

  it('setUser cập nhật thông tin user', () => {
    const { result } = renderHook(() => useAuthStore())
    act(() => {
      result.current.setAuth(mockAuthPayload)
      result.current.setUser({ ...mockAuthPayload.user, full_name: 'Tên Mới' })
    })
    expect(result.current.user?.full_name).toBe('Tên Mới')
  })

  it('setSubscription cập nhật plan lên monthly', () => {
    const { result } = renderHook(() => useAuthStore())
    act(() => {
      result.current.setAuth(mockAuthPayload)
      result.current.setSubscription({ ...mockSubscription, plan: 'monthly' })
    })
    expect(result.current.subscription?.plan).toBe('monthly')
  })

  it('clearAuth xóa toàn bộ state', () => {
    const { result } = renderHook(() => useAuthStore())
    act(() => {
      result.current.setAuth(mockAuthPayload)
      result.current.setSubscription(mockSubscription)
      result.current.clearAuth()
    })
    expect(result.current.user).toBeNull()
    expect(result.current.subscription).toBeNull()
    expect(result.current.isAuthenticated).toBe(false)
    expect(result.current.accessToken).toBeNull()
    expect(result.current.refreshToken).toBeNull()
  })
})
