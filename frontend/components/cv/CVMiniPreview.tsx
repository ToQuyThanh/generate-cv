'use client'

/**
 * CVMiniPreview
 *
 * Render bản thu nhỏ của CV preview, dùng cho:
 * - Template card trong trang /cv/new (thumbnail)
 * - Thumbnail trong CVCard (dashboard)
 *
 * Không phụ thuộc editorStore — nhận props trực tiếp.
 * Scale-down bằng CSS transform để giữ nguyên font/layout thật.
 *
 * Khi templateId được truyền vào, component resolve đúng template
 * từ registry thay vì dùng layout hardcode.
 */

import type { CVSection } from '@/types'
import { resolveTemplate } from '@/templates/registry'

interface CVMiniPreviewProps {
  sections: CVSection[]
  colorTheme: string
  /** Template ID để resolve đúng layout. Mặc định: 'template_modern_01' */
  templateId?: string
  /** Chiều rộng container hiển thị (px). Mini preview sẽ scale vừa vào đây. Default: 160 */
  containerWidth?: number
  /** Khoảng cách (px) giữa viền container và nội dung CV — trên / trái / phải. Default: 8 */
  gap?: number
}

/** Kích thước A4 gốc */
const CV_FULL_WIDTH = 595

export function CVMiniPreview({
  sections,
  colorTheme,
  templateId = 'template_modern_01',
  containerWidth = 160,
  gap = 8,
}: CVMiniPreviewProps) {
  const cvDisplayWidth = containerWidth - gap * 2
  const scale = cvDisplayWidth / CV_FULL_WIDTH
  const cvDisplayHeight = Math.round(841 * scale)
  const containerHeight = cvDisplayHeight + gap

  const { component: TemplateComponent } = resolveTemplate(templateId)

  return (
    <div
      style={{ width: containerWidth, height: containerHeight, overflow: 'hidden', position: 'relative' }}
    >
      <div
        style={{
          width: CV_FULL_WIDTH,
          minHeight: 841,
          transformOrigin: 'top left',
          transform: `scale(${scale})`,
          position: 'absolute',
          top: gap,
          left: gap,
          pointerEvents: 'none',
        }}
      >
        <TemplateComponent sections={sections} colorTheme={colorTheme} />
      </div>
    </div>
  )
}
