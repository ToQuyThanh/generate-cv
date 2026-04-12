import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { PaywallModal } from '@/components/payment/PaywallModal'

// Mock useRouter
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
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
    expect(screen.getByText(/29.000đ/)).toBeInTheDocument()
  })

  it('gọi onClose khi bấm nút X', () => {
    const onClose = vi.fn()
    render(<PaywallModal open={true} onClose={onClose} />)
    const closeBtn = screen.getByRole('button', { name: '' }) // X button
    // Tìm button đầu tiên (X)
    const allBtns = screen.getAllByRole('button')
    fireEvent.click(allBtns[0]) // X button
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('gọi onClose khi bấm "Để sau"', () => {
    const onClose = vi.fn()
    render(<PaywallModal open={true} onClose={onClose} />)
    fireEvent.click(screen.getByText('Để sau'))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('có nút "Xem các gói"', () => {
    render(<PaywallModal open={true} onClose={() => {}} />)
    expect(screen.getByText('Xem các gói')).toBeInTheDocument()
  })
})
