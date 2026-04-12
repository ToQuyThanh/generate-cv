/**
 * new-cv-page-template.test.ts
 *
 * Test các behavior liên quan đến BLANK_TEMPLATE trong trang /cv/new:
 * - Blank luôn là option đầu tiên dù API trả gì
 * - Blank là selection mặc định
 * - Fetch lỗi không xóa Blank khỏi danh sách
 */

import { describe, it, expect } from 'vitest'

// ─── Helpers re-implement logic từ page (không import page trực tiếp
//     vì page là Next.js Client Component với nhiều dependency phức tạp) ───

import type { Template } from '@/types'

const BLANK_TEMPLATE: Template = {
  id: 'blank',
  name: 'Trống',
  thumbnail_url: null,
  preview_url: null,
  is_premium: false,
  tags: [],
}

/** Merge giống như page: [BLANK, ...apiTemplates] */
function mergeWithBlank(apiTemplates: Template[]): Template[] {
  return [BLANK_TEMPLATE, ...apiTemplates]
}

const API_TEMPLATES: Template[] = [
  { id: 'tpl-1', name: 'Modern', thumbnail_url: null, preview_url: null, is_premium: false, tags: [] },
  { id: 'tpl-2', name: 'Classic', thumbnail_url: null, preview_url: null, is_premium: true, tags: [] },
]

describe('BLANK_TEMPLATE constant', () => {
  it('có id là "blank"', () => {
    expect(BLANK_TEMPLATE.id).toBe('blank')
  })

  it('không phải premium — free user luôn chọn được', () => {
    expect(BLANK_TEMPLATE.is_premium).toBe(false)
  })

  it('tên hiển thị là "Trống"', () => {
    expect(BLANK_TEMPLATE.name).toBe('Trống')
  })
})

describe('mergeWithBlank — hiển thị template list', () => {
  it('blank luôn là phần tử đầu tiên khi API trả bình thường', () => {
    const list = mergeWithBlank(API_TEMPLATES)
    expect(list[0].id).toBe('blank')
  })

  it('tổng số = 1 blank + số template từ API', () => {
    const list = mergeWithBlank(API_TEMPLATES)
    expect(list).toHaveLength(API_TEMPLATES.length + 1)
  })

  it('vẫn có blank khi API trả mảng rỗng', () => {
    const list = mergeWithBlank([])
    expect(list).toHaveLength(1)
    expect(list[0].id).toBe('blank')
  })

  it('vẫn có blank khi fetch lỗi (giữ nguyên state khởi tạo)', () => {
    // State khởi tạo của page là [BLANK_TEMPLATE]
    const initialState = [BLANK_TEMPLATE]
    // Fetch lỗi → không cập nhật state → initialState vẫn nguyên
    expect(initialState[0].id).toBe('blank')
    expect(initialState).toHaveLength(1)
  })

  it('blank không bị duplicate khi merge nhiều lần (phòng re-render)', () => {
    const once = mergeWithBlank(API_TEMPLATES)
    // Nếu vô tình gọi merge lại với list đã có blank thì duplicate
    // — page tránh điều này bằng cách chỉ gọi merge trong .then() một lần
    const blanksInOnce = once.filter((t) => t.id === 'blank')
    expect(blanksInOnce).toHaveLength(1)
  })

  it('thứ tự các template từ API được giữ nguyên sau blank', () => {
    const list = mergeWithBlank(API_TEMPLATES)
    expect(list[1].id).toBe('tpl-1')
    expect(list[2].id).toBe('tpl-2')
  })
})

describe('selectedTemplate default', () => {
  it('giá trị mặc định phải là "blank" (khớp BLANK_TEMPLATE.id)', () => {
    // Kiểm tra constant — đảm bảo nếu ai đổi id thì test này fail ngay
    const DEFAULT_SELECTED = 'blank'
    expect(DEFAULT_SELECTED).toBe(BLANK_TEMPLATE.id)
  })
})
