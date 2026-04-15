import { describe, it, expect } from 'vitest'
import {
  TEMPLATE_REGISTRY,
  resolveTemplate,
  getAllTemplates,
  getDefaultColor,
  DEFAULT_TEMPLATE_ID,
} from '@/templates/registry'

describe('Template Registry', () => {
  it('có đủ số lượng template được đăng ký', () => {
    expect(Object.keys(TEMPLATE_REGISTRY).length).toBeGreaterThanOrEqual(9)
  })

  it('các template ID bắt buộc phải có mặt', () => {
    const ids = Object.keys(TEMPLATE_REGISTRY)
    expect(ids).toContain('template_modern_01')
    expect(ids).toContain('template_classic_01')
    expect(ids).toContain('template_minimal_01')
    expect(ids).toContain('template_sidebar_01')
    expect(ids).toContain('template_executive_01')
    expect(ids).toContain('template_creative_01')
    expect(ids).toContain('template_ats_clean_01')
    expect(ids).toContain('template_ats_pro_01')
    expect(ids).toContain('template_compact_01')
  })

  it('mỗi entry đều có meta và component', () => {
    for (const entry of Object.values(TEMPLATE_REGISTRY)) {
      expect(entry.meta).toBeDefined()
      expect(entry.meta.id).toBeTruthy()
      expect(entry.meta.name).toBeTruthy()
      expect(typeof entry.meta.isPremium).toBe('boolean')
      expect(Array.isArray(entry.meta.tags)).toBe(true)
      expect(entry.meta.defaultColor).toMatch(/^#[0-9a-fA-F]{6}$/)
      expect(typeof entry.component).toBe('function')
    }
  })

  describe('resolveTemplate', () => {
    it('trả về đúng entry khi templateId hợp lệ', () => {
      const entry = resolveTemplate('template_classic_01')
      expect(entry.meta.id).toBe('template_classic_01')
      expect(entry.meta.name).toBe('Classic')
    })

    it('fallback về Modern khi templateId không tồn tại', () => {
      const entry = resolveTemplate('template_khong_ton_tai')
      expect(entry.meta.id).toBe(DEFAULT_TEMPLATE_ID)
    })

    it('fallback về Modern khi templateId rỗng', () => {
      const entry = resolveTemplate('')
      expect(entry.meta.id).toBe(DEFAULT_TEMPLATE_ID)
    })
  })

  describe('getAllTemplates', () => {
    it('trả về đúng số lượng template', () => {
      const list = getAllTemplates()
      expect(list).toHaveLength(Object.keys(TEMPLATE_REGISTRY).length)
    })

    it('free template đứng trước premium template', () => {
      const list = getAllTemplates()
      const firstPremiumIdx = list.findIndex((t) => t.meta.isPremium)
      const lastFreeIdx = list.map((t) => t.meta.isPremium).lastIndexOf(false)
      if (firstPremiumIdx !== -1 && lastFreeIdx !== -1) {
        expect(lastFreeIdx).toBeLessThan(firstPremiumIdx)
      }
    })

    it('modern và classic là free, sidebar là premium', () => {
      const list = getAllTemplates()
      const modern = list.find((t) => t.meta.id === 'template_modern_01')
      const classic = list.find((t) => t.meta.id === 'template_classic_01')
      const sidebar = list.find((t) => t.meta.id === 'template_sidebar_01')

      expect(modern?.meta.isPremium).toBe(false)
      expect(classic?.meta.isPremium).toBe(false)
      expect(sidebar?.meta.isPremium).toBe(true)
    })
  })

  describe('getDefaultColor', () => {
    it('trả về màu mặc định đúng của Modern', () => {
      expect(getDefaultColor('template_modern_01')).toBe('#1a56db')
    })

    it('trả về màu mặc định đúng của Minimal', () => {
      expect(getDefaultColor('template_minimal_01')).toBe('#059669')
    })

    it('trả về màu Modern làm fallback khi templateId không tồn tại', () => {
      expect(getDefaultColor('template_xyz')).toBe('#1a56db')
    })
  })

  describe('Meta integrity', () => {
    it('không có hai template cùng ID', () => {
      const ids = Object.values(TEMPLATE_REGISTRY).map((e) => e.meta.id)
      const unique = new Set(ids)
      expect(unique.size).toBe(ids.length)
    })

    it('meta.id phải khớp với key trong registry', () => {
      for (const [key, entry] of Object.entries(TEMPLATE_REGISTRY)) {
        expect(entry.meta.id).toBe(key)
      }
    })

    it('tất cả tags đều là string không rỗng', () => {
      for (const entry of Object.values(TEMPLATE_REGISTRY)) {
        for (const tag of entry.meta.tags) {
          expect(typeof tag).toBe('string')
          expect(tag.length).toBeGreaterThan(0)
        }
      }
    })
  })
})
