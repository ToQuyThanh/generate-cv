import { describe, it, expect } from 'vitest'
import { cn, formatDate, formatRelativeTime, getPlanLabel, getPlanColor } from '@/lib/utils'

describe('cn()', () => {
  it('merge class names đúng', () => {
    expect(cn('foo', 'bar')).toBe('foo bar')
  })

  it('loại bỏ class trùng với tailwind-merge', () => {
    expect(cn('p-2', 'p-4')).toBe('p-4')
  })

  it('xử lý conditional classes', () => {
    expect(cn('base', false && 'hidden', 'shown')).toBe('base shown')
  })
})

describe('formatDate()', () => {
  it('trả về định dạng dd/mm/yyyy tiếng Việt', () => {
    const result = formatDate('2026-04-12T00:00:00Z')
    expect(result).toMatch(/\d{2}\/\d{2}\/\d{4}/)
  })
})

describe('formatRelativeTime()', () => {
  it('trả về "Hôm nay" cho ngày hôm nay', () => {
    const now = new Date().toISOString()
    expect(formatRelativeTime(now)).toBe('Hôm nay')
  })

  it('trả về "Hôm qua" cho ngày hôm qua', () => {
    const yesterday = new Date(Date.now() - 86_400_000).toISOString()
    expect(formatRelativeTime(yesterday)).toBe('Hôm qua')
  })

  it('trả về "N ngày trước" cho ngày trong tuần', () => {
    const threeDaysAgo = new Date(Date.now() - 3 * 86_400_000).toISOString()
    expect(formatRelativeTime(threeDaysAgo)).toBe('3 ngày trước')
  })

  it('trả về "N tuần trước" cho ngày trong tháng', () => {
    const twoWeeksAgo = new Date(Date.now() - 14 * 86_400_000).toISOString()
    expect(formatRelativeTime(twoWeeksAgo)).toBe('2 tuần trước')
  })
})

describe('getPlanLabel()', () => {
  it('trả về nhãn đúng cho từng plan', () => {
    expect(getPlanLabel('free')).toBe('Miễn phí')
    expect(getPlanLabel('weekly')).toBe('Gói Tuần')
    expect(getPlanLabel('monthly')).toBe('Gói Tháng')
  })

  it('fallback về Miễn phí cho plan không xác định', () => {
    expect(getPlanLabel('unknown')).toBe('Miễn phí')
  })
})

describe('getPlanColor()', () => {
  it('trả về class màu phù hợp', () => {
    expect(getPlanColor('weekly')).toContain('blue')
    expect(getPlanColor('monthly')).toContain('purple')
    expect(getPlanColor('free')).toContain('gray')
  })
})
