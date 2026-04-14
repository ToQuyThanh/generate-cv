/**
 * cv-template.ts
 *
 * Blank template — bộ sections mặc định khi tạo CV mới.
 * Mỗi section có đủ type / title / visible / order / data rỗng
 * để EditorPanel có thể render ngay mà không cần backend trả sections.
 */

import type { CVSection, SectionType } from '@/types'

interface SectionMeta {
  type: SectionType
  title: string
  order: number
  data: Record<string, unknown>
}

const BLANK_SECTIONS_META: SectionMeta[] = [
  {
    type: 'personal',
    title: 'Thông tin cá nhân',
    order: 0,
    data: {
      full_name: '',
      job_title: '',
      email: '',
      phone: '',
      location: '',
      website: '',
      linkedin: '',
      github: '',
      avatar_url: '',
    },
  },
  {
    type: 'summary',
    title: 'Giới thiệu bản thân',
    order: 1,
    data: { content: '' },
  },
  {
    type: 'experience',
    title: 'Kinh nghiệm làm việc',
    order: 2,
    data: { items: [] },
  },
  {
    type: 'education',
    title: 'Học vấn',
    order: 3,
    data: { items: [] },
  },
  {
    type: 'skills',
    title: 'Kỹ năng',
    order: 4,
    data: { items: [] },
  },
]

/**
 * Trả về mảng CVSection blank cho CV mới.
 * ID được sinh bằng crypto.randomUUID() — stable trong browser & Node 18+.
 */
export function getBlankSections(): CVSection[] {
  return BLANK_SECTIONS_META.map((meta) => ({
    id: crypto.randomUUID(),
    type: meta.type,
    title: meta.title,
    visible: true,
    order: meta.order,
    data: { ...meta.data },
  }))
}

/**
 * Trả về mảng CVSection với fake data để preview template.
 * Dùng cho thumbnail trên trang /cv/new — không dùng trong editor.
 */
export function getSampleSections(): CVSection[] {
  return [
    {
      id: 'sample-personal',
      type: 'personal',
      title: 'Thông tin cá nhân',
      visible: true,
      order: 0,
      data: {
        full_name: 'Nguyễn Minh Khoa',
        job_title: 'Senior Frontend Developer',
        email: 'khoa.nguyen@email.com',
        phone: '0912 345 678',
        location: 'Hà Nội, Việt Nam',
        website: 'minhkhoa.dev',
        linkedin: 'linkedin.com/in/minhkhoa',
        github: 'github.com/minhkhoa',
        avatar_url: '',
      },
    },
    {
      id: 'sample-summary',
      type: 'summary',
      title: 'Giới thiệu bản thân',
      visible: true,
      order: 1,
      data: {
        content:
          'Frontend Developer với 5 năm kinh nghiệm xây dựng ứng dụng web hiệu năng cao. Thành thạo React, TypeScript và Next.js. Đam mê tạo ra giao diện người dùng mượt mà, tối ưu trải nghiệm người dùng và viết code sạch, dễ bảo trì.',
      },
    },
    {
      id: 'sample-experience',
      type: 'experience',
      title: 'Kinh nghiệm làm việc',
      visible: true,
      order: 2,
      data: {
        items: [
          {
            id: 'exp-1',
            company: 'TechCorp Vietnam',
            position: 'Senior Frontend Developer',
            location: 'Hà Nội',
            start_date: '01/2022',
            end_date: '',
            is_current: true,
            description:
              'Dẫn dắt nhóm 4 kỹ sư frontend phát triển nền tảng SaaS B2B. Tái cấu trúc kiến trúc React giúp giảm 40% thời gian tải trang. Triển khai CI/CD pipeline với GitHub Actions và Docker.',
          },
          {
            id: 'exp-2',
            company: 'StartupXYZ',
            position: 'Frontend Developer',
            location: 'TP. Hồ Chí Minh',
            start_date: '06/2020',
            end_date: '12/2021',
            is_current: false,
            description:
              'Phát triển dashboard quản lý với React và D3.js. Xây dựng hệ thống design system từ đầu, tăng tốc độ phát triển tính năng mới lên 60%.',
          },
          {
            id: 'exp-3',
            company: 'Digital Agency ABC',
            position: 'Junior Frontend Developer',
            location: 'Hà Nội',
            start_date: '08/2019',
            end_date: '05/2020',
            is_current: false,
            description:
              'Xây dựng landing page và website thương mại điện tử cho nhiều khách hàng lớn. Tối ưu SEO và hiệu suất trang web.',
          },
        ],
      },
    },
    {
      id: 'sample-education',
      type: 'education',
      title: 'Học vấn',
      visible: true,
      order: 3,
      data: {
        items: [
          {
            id: 'edu-1',
            school: 'Đại học Bách Khoa Hà Nội',
            degree: 'Kỹ sư',
            field: 'Công nghệ thông tin',
            start_date: '2015',
            end_date: '2019',
            gpa: '3.6/4.0',
          },
        ],
      },
    },
    {
      id: 'sample-skills',
      type: 'skills',
      title: 'Kỹ năng',
      visible: true,
      order: 4,
      data: {
        items: [
          { id: 'sk-1', name: 'React / Next.js', level: 5 },
          { id: 'sk-2', name: 'TypeScript', level: 5 },
          { id: 'sk-3', name: 'Node.js', level: 4 },
          { id: 'sk-4', name: 'Tailwind CSS', level: 5 },
          { id: 'sk-5', name: 'GraphQL', level: 3 },
          { id: 'sk-6', name: 'PostgreSQL', level: 3 },
          { id: 'sk-7', name: 'Docker', level: 3 },
          { id: 'sk-8', name: 'Git / GitHub', level: 5 },
        ],
      },
    },
    {
      id: 'sample-projects',
      type: 'projects',
      title: 'Dự án',
      visible: true,
      order: 5,
      data: {
        items: [
          {
            id: 'prj-1',
            name: 'OpenTask — Quản lý công việc',
            role: 'Lead Developer',
            url: 'opentask.io',
            start_date: '03/2023',
            end_date: '09/2023',
            description:
              'Ứng dụng quản lý dự án real-time cho nhóm nhỏ. Tích hợp Kanban board, thông báo push và chế độ offline.',
            tech_stack: ['Next.js', 'Prisma', 'Socket.io', 'Vercel'],
          },
        ],
      },
    },
    {
      id: 'sample-certifications',
      type: 'certifications',
      title: 'Chứng chỉ',
      visible: true,
      order: 6,
      data: {
        items: [
          {
            id: 'cert-1',
            name: 'AWS Certified Developer – Associate',
            issuer: 'Amazon Web Services',
            date: '06/2023',
            credential_id: 'AWS-DEV-2023-XXXXX',
          },
          {
            id: 'cert-2',
            name: 'Google UX Design Certificate',
            issuer: 'Google / Coursera',
            date: '02/2022',
          },
        ],
      },
    },
    {
      id: 'sample-languages',
      type: 'languages',
      title: 'Ngôn ngữ',
      visible: true,
      order: 7,
      data: {
        items: [
          { id: 'lang-1', language: 'Tiếng Việt', level: 'native' },
          { id: 'lang-2', language: 'Tiếng Anh', level: 'professional' },
          { id: 'lang-3', language: 'Tiếng Nhật', level: 'basic' },
        ],
      },
    },
  ] as CVSection[]
}
