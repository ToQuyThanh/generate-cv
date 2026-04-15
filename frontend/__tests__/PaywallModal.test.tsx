import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { PaywallModal } from '@/components/payment/PaywallModal'

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({ push: vi.fn() })),
}))

describe('PaywallModal', () => {
  it('không render khi open=false', () => {
    render(<PaywallModal open={false} onClose={() => {}} />)
    expect(screen.queryByText('Nâng cấp tài khoản')).not.toBeInTheDocument()
  })

  it('render khi open=true', () => {
    render(<PaywallModal open={true} onClose={() => {}} />)
    expect(screen.getByText('Nâng cấp tài khoản')).toBeInTheDocument()
    expect(screen.getByText('Xuất PDF không watermark')).toBeInTheDocument()
    expect(screen.getByText('Gợi ý AI không giới hạn')).toBeInTheDocument()
  })

  it('hiển thị giá đúng: 49.000đ / tuần', () => {
    render(<PaywallModal open={true} onClose={() => {}} />)
    // "49.000đ / tuần" nằm trong <span> riêng — match chính xác text của span đó
    expect(screen.getByText('49.000đ / tuần')).toBeInTheDocument()
  })

  it('hiển thị đoạn "Chỉ từ" trong price block', () => {
    render(<PaywallModal open={true} onClose={() => {}} />)
    // Dùng function matcher để tìm toàn bộ text trong <p> kể cả text bị split bởi <span>
    const priceEl = screen.getByText((_, element) => {
      return element?.tagName === 'P' &&
        (element.textContent ?? '').includes('Chỉ từ') &&
        (element.textContent ?? '').includes('49.000đ')
    })
    expect(priceEl).toBeInTheDocument()
  })

  it('KHÔNG hiển thị giá cũ 29.000đ', () => {
    render(<PaywallModal open={true} onClose={() => {}} />)
    expect(screen.queryByText(/29\.000/)).not.toBeInTheDocument()
  })

  it('gọi onClose khi bấm nút X', () => {
    const onClose = vi.fn()
    render(<PaywallModal open={true} onClose={onClose} />)
    fireEvent.click(screen.getByRole('button', { name: 'Đóng' }))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('gọi onClose khi bấm "Để sau"', () => {
    const onClose = vi.fn()
    render(<PaywallModal open={true} onClose={onClose} />)
    fireEvent.click(screen.getByText('Để sau'))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('có nút "Xem các gói" và gọi onClose khi click', () => {
    const onClose = vi.fn()
    render(<PaywallModal open={true} onClose={onClose} />)
    fireEvent.click(screen.getByText('Xem các gói'))
    expect(onClose).toHaveBeenCalled()
  })

  it('hiển thị đủ 3 benefits', () => {
    render(<PaywallModal open={true} onClose={() => {}} />)
    expect(screen.getByText('Xuất PDF không watermark')).toBeInTheDocument()
    expect(screen.getByText('Gợi ý AI không giới hạn')).toBeInTheDocument()
    expect(screen.getByText('Truy cập template premium')).toBeInTheDocument()
  })
})
