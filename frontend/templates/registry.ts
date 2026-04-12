/**
 * templates/registry.ts
 *
 * Single source of truth cho mọi template.
 * Thêm template mới = thêm entry vào TEMPLATE_REGISTRY.
 *
 * Quy trình thêm template:
 *   1. Tạo frontend/templates/{name}/meta.ts
 *   2. Tạo frontend/templates/{name}/index.tsx
 *   3. Đăng ký vào TEMPLATE_REGISTRY bên dưới
 *   4. Chạy npm run seed:templates (sync metadata lên DB)
 */

import type { TemplateEntry } from './types'

import { ModernTemplate } from './modern'
import { modernMeta } from './modern/meta'

import { ClassicTemplate } from './classic'
import { classicMeta } from './classic/meta'

import { MinimalTemplate } from './minimal'
import { minimalMeta } from './minimal/meta'

import { SidebarTemplate } from './sidebar'
import { sidebarMeta } from './sidebar/meta'

import { ExecutiveTemplate } from './executive'
import { executiveMeta } from './executive/meta'

import { CreativeTemplate } from './creative'
import { creativeMeta } from './creative/meta'

import { AtsCleanTemplate } from './ats-clean'
import { atsCleanMeta } from './ats-clean/meta'

import { AtsProTemplate } from './ats-pro'
import { atsProMeta } from './ats-pro/meta'

import { CompactTemplate } from './compact'
import { compactMeta } from './compact/meta'

// ─── Registry ────────────────────────────────────────────────────────────────

export const TEMPLATE_REGISTRY: Record<string, TemplateEntry> = {
  [modernMeta.id]: {
    meta: modernMeta,
    component: ModernTemplate,
  },
  [classicMeta.id]: {
    meta: classicMeta,
    component: ClassicTemplate,
  },
  [minimalMeta.id]: {
    meta: minimalMeta,
    component: MinimalTemplate,
  },
  [sidebarMeta.id]: {
    meta: sidebarMeta,
    component: SidebarTemplate,
  },
  [executiveMeta.id]: {
    meta: executiveMeta,
    component: ExecutiveTemplate,
  },
  [creativeMeta.id]: {
    meta: creativeMeta,
    component: CreativeTemplate,
  },
  [atsCleanMeta.id]: {
    meta: atsCleanMeta,
    component: AtsCleanTemplate,
  },
  [atsProMeta.id]: {
    meta: atsProMeta,
    component: AtsProTemplate,
  },
  [compactMeta.id]: {
    meta: compactMeta,
    component: CompactTemplate,
  },
}

/** ID mặc định khi template_id không hợp lệ hoặc không tìm thấy */
export const DEFAULT_TEMPLATE_ID = modernMeta.id

// ─── Lookup helpers ───────────────────────────────────────────────────────────

export function resolveTemplate(templateId: string): TemplateEntry {
  return TEMPLATE_REGISTRY[templateId] ?? TEMPLATE_REGISTRY[DEFAULT_TEMPLATE_ID]
}

export function getAllTemplates(): TemplateEntry[] {
  return Object.values(TEMPLATE_REGISTRY).sort((a, b) => {
    if (a.meta.isPremium === b.meta.isPremium) return a.meta.name.localeCompare(b.meta.name)
    return a.meta.isPremium ? 1 : -1
  })
}

export function getDefaultColor(templateId: string): string {
  return resolveTemplate(templateId).meta.defaultColor ?? '#1a56db'
}
