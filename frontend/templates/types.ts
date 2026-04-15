/**
 * templates/types.ts
 */

import type {
  CVSection,
  PersonalData,
  SummaryData,
  ExperienceData,
  EducationData,
  SkillsData,
  ExperienceItem,
  EducationItem,
  SkillItem,
} from '@/types'

export interface TemplateProps {
  sections: CVSection[]
  colorTheme: string
}

export interface TemplateMeta {
  id: string
  name: string
  isPremium: boolean
  tags: string[]
  defaultColor: string
  /** Mô tả ngắn hiển thị bên dưới card template */
  description?: string
}

export interface TemplateEntry {
  meta: TemplateMeta
  component: React.ComponentType<TemplateProps>
}

export function getPersonal(sections: CVSection[]): Partial<PersonalData> {
  const sec = sections.find((s) => s.type === 'personal')
  return (sec?.data ?? {}) as Partial<PersonalData>
}

export function getSummary(sections: CVSection[]): string {
  const sec = sections.find((s) => s.type === 'summary')
  return ((sec?.data as SummaryData | undefined)?.content ?? '')
}

export function getExperience(sections: CVSection[]): ExperienceItem[] {
  const sec = sections.find((s) => s.type === 'experience')
  return ((sec?.data as ExperienceData | undefined)?.items ?? [])
}

export function getEducation(sections: CVSection[]): EducationItem[] {
  const sec = sections.find((s) => s.type === 'education')
  return ((sec?.data as EducationData | undefined)?.items ?? [])
}

export function getSkills(sections: CVSection[]): SkillItem[] {
  const sec = sections.find((s) => s.type === 'skills')
  return ((sec?.data as SkillsData | undefined)?.items ?? [])
}

export function getVisibleSections(sections: CVSection[]): CVSection[] {
  return [...sections].filter((s) => s.visible).sort((a, b) => a.order - b.order)
}
