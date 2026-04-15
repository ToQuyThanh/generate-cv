/**
 * profile-snapshot.ts
 *
 * Chuyển đổi `profile_snapshot` (JSONB từ backend) thành mảng `CVSection[]`
 * để populate vào editor khi CV được tạo từ một profile.
 *
 * profile_snapshot shape (xem service/cv.go → buildProfileSnapshot):
 * {
 *   id, name, role_target, summary,
 *   full_name, email, phone, location,
 *   linkedin_url, github_url, website_url, avatar_url,
 *   sections: [
 *     { id, type, title, position, is_visible, items: [{ id, position, is_visible, data }] }
 *   ]
 * }
 *
 * CVSection shape (types/index.ts):
 * { id, type, title, visible, order, data }
 */

import type { CVSection, SectionType, LanguageLevel } from '@/types'

// ─── Snapshot types (mirror backend buildProfileSnapshot structs) ──────────

interface SnapshotItem {
  id: string
  position: number
  is_visible: boolean
  data: Record<string, unknown>
}

interface SnapshotSection {
  id: string
  type: string
  title: string
  position: number
  is_visible: boolean
  items: SnapshotItem[]
}

export interface ProfileSnapshot {
  id: string
  name: string
  role_target?: string
  summary?: string
  full_name?: string
  email?: string
  phone?: string
  location?: string
  linkedin_url?: string
  github_url?: string
  website_url?: string
  avatar_url?: string
  sections?: SnapshotSection[]
}

// ─── Mapping: ProfileSectionType → CVSectionType ──────────────────────────

/**
 * Profile dùng snake_case type names ("work_experience", "education", "skills"…)
 * CV Editor dùng short names ("experience", "education", "skills"…)
 *
 * Map những type khác nhau; giữ nguyên những type đã trùng.
 */
const PROFILE_TYPE_TO_CV_TYPE: Record<string, SectionType> = {
  work_experience: 'experience',
  education: 'education',
  skills: 'skills',
  projects: 'projects',
  certifications: 'certifications',
  languages: 'languages',
  custom: 'custom' as SectionType,
}

function toCVSectionType(profileType: string): SectionType {
  return PROFILE_TYPE_TO_CV_TYPE[profileType] ?? (profileType as SectionType)
}

// ─── Build data per section type ───────────────────────────────────────────

/**
 * Chuyển items của snapshot section thành `data` của CVSection,
 * theo shape mà EditorPanel / template render engine expect.
 */
function buildSectionData(
  sectionType: string,
  items: SnapshotItem[]
): Record<string, unknown> {
  const visibleItems = items
    .filter((it) => it.is_visible)
    .sort((a, b) => a.position - b.position)

  switch (sectionType) {
    case 'work_experience':
      return {
        items: visibleItems.map((it) => ({
          id:           it.id,
          company:      (it.data.company as string)       ?? '',
          position:     (it.data.position as string)      ?? '',
          location:     (it.data.location as string)      ?? '',
          start_date:   (it.data.start_date as string)    ?? '',
          end_date:     (it.data.end_date as string)      ?? '',
          is_current:   (it.data.is_current as boolean)   ?? false,
          description:  (it.data.description as string)   ?? '',
          achievements: (it.data.achievements as string[]) ?? [],
          tech_stack:   (it.data.tech_stack as string[])   ?? [],
        })),
      }

    case 'education':
      return {
        items: visibleItems.map((it) => ({
          id:          it.id,
          school:      (it.data.school as string)      ?? '',
          degree:      (it.data.degree as string)      ?? '',
          field:       (it.data.field as string)       ?? '',
          start_date:  (it.data.start_date as string)  ?? '',
          end_date:    (it.data.end_date as string)    ?? '',
          gpa:         (it.data.gpa as string)         ?? '',
          // profile saves field as "activities", CV editor uses "description"
          description: (it.data.activities as string) ?? (it.data.description as string) ?? '',
        })),
      }

    case 'skills':
      // Skills section trong profile lưu theo nhóm (SkillsItemData: { group_name, skills[] })
      // CV Editor expect mảng flat items với { id, name, level }
      return {
        items: visibleItems.flatMap((it) => {
          const skills = (it.data.skills as string[]) ?? []
          return skills.map((skillName, idx) => ({
            id:    `${it.id}-${idx}`,
            name:  skillName,
            level: 3 as const,
          }))
        }),
      }

    case 'projects':
      return {
        items: visibleItems.map((it) => ({
          id:          it.id,
          name:        (it.data.name as string)          ?? '',
          role:        (it.data.role as string)          ?? '',
          url:         (it.data.url as string)           ?? '',
          start_date:  (it.data.start_date as string)    ?? '',
          end_date:    (it.data.end_date as string)      ?? '',
          description: (it.data.description as string)   ?? '',
          tech_stack:  (it.data.tech_stack as string[])  ?? [],
          highlights:  (it.data.highlights as string[])  ?? [],
        })),
      }

    case 'certifications':
      return {
        items: visibleItems.map((it) => ({
          id:            it.id,
          name:          (it.data.name as string)           ?? '',
          issuer:        (it.data.issuer as string)         ?? '',
          date:          (it.data.date as string)           ?? '',
          url:           (it.data.url as string)            ?? '',
          credential_id: (it.data.credential_id as string)  ?? '',
        })),
      }

    case 'languages':
      return {
        items: visibleItems.map((it) => ({
          id:       it.id,
          // profile may store as "language" or "name"
          language: (it.data.language as string) ?? (it.data.name as string) ?? '',
          level:    ((it.data.level as string) ?? 'professional') as LanguageLevel,
        })),
      }

    default:
      // custom / unknown: pass raw items data through
      return { items: visibleItems.map((it) => ({ id: it.id, ...it.data })) }
  }
}

// ─── Public API ────────────────────────────────────────────────────────────

/**
 * Tạo CVSection "personal" từ personal info trong snapshot.
 */
function buildPersonalSection(snap: ProfileSnapshot): CVSection {
  return {
    id: `snapshot-personal-${snap.id}`,
    type: 'personal',
    title: 'Thông tin cá nhân',
    visible: true,
    order: 0,
    data: {
      full_name:  snap.full_name   ?? '',
      job_title:  snap.role_target ?? '',
      email:      snap.email       ?? '',
      phone:      snap.phone       ?? '',
      location:   snap.location    ?? '',
      website:    snap.website_url  ?? '',
      linkedin:   snap.linkedin_url ?? '',
      github:     snap.github_url   ?? '',
      avatar_url: snap.avatar_url   ?? '',
    },
  }
}

/**
 * Tạo CVSection "summary" từ summary trong snapshot.
 */
function buildSummarySection(snap: ProfileSnapshot): CVSection {
  return {
    id: `snapshot-summary-${snap.id}`,
    type: 'summary',
    title: 'Giới thiệu bản thân',
    visible: true,
    order: 1,
    data: { content: snap.summary ?? '' },
  }
}

/**
 * Chuyển toàn bộ profile_snapshot thành mảng CVSection[].
 *
 * Thứ tự: personal (0) → summary (1) → profile sections (2+)
 *
 * @param snapshot  Object parsed từ CV.profile_snapshot
 * @returns         Mảng CVSection[] sẵn sàng đưa vào editorStore
 */
export function snapshotToSections(snapshot: ProfileSnapshot): CVSection[] {
  const sections: CVSection[] = []

  sections.push(buildPersonalSection(snapshot))
  sections.push(buildSummarySection(snapshot))

  const profileSections = (snapshot.sections ?? [])
    .filter((s) => s.is_visible)
    .sort((a, b) => a.position - b.position)

  profileSections.forEach((sec, idx) => {
    sections.push({
      id:      `snapshot-${sec.id}`,
      type:    toCVSectionType(sec.type),
      title:   sec.title,
      visible: true,
      order:   idx + 2,
      data:    buildSectionData(sec.type, sec.items ?? []),
    })
  })

  return sections
}

/**
 * Kiểm tra xem CV có profile_snapshot hợp lệ không.
 */
export function hasProfileSnapshot(
  snapshot: Record<string, unknown> | null | undefined
): snapshot is Record<string, unknown> {
  return !!snapshot && typeof snapshot === 'object' && 'id' in snapshot
}
