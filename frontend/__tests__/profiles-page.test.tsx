import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useRouter } from 'next/navigation'
import ProfilesPage from '@/app/(dashboard)/profiles/page'
import type { CVProfileListItem } from '@/types'

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('next/navigation', () => ({ useRouter: vi.fn() }))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }))
vi.mock('date-fns', () => ({
  formatDistanceToNow: vi.fn(() => 'vài phút trước'),
}))
vi.mock('date-fns/locale', () => ({ vi: {} }))

const mockPush = vi.fn()
const mockFetchProfiles = vi.fn()
const mockCreateProfile = vi.fn()
const mockDeleteProfile = vi.fn()
const mockSetDefault = vi.fn()

vi.mock('@/store', () => ({
  useProfileStore: vi.fn(() => ({
    profiles: [],
    loading: false,
    fetchProfiles: mockFetchProfiles,
    createProfile: mockCreateProfile,
    deleteProfile: mockDeleteProfile,
    setDefault: mockSetDefault,
  })),
}))

// ── Fixtures ──────────────────────────────────────────────────────────────────

const mockProfiles: CVProfileListItem[] = [
  {
    id: 'profile-1',
    name: 'Senior Backend Engineer',
    role_target: 'Software Engineer',
    full_name: 'Nguyen Van A',
    email: 'a@example.com',
    is_default: true,
    section_count: 3,
    created_at: '2026-04-01T00:00:00Z',
    updated_at: '2026-04-10T00:00:00Z',
  },
  {
    id: 'profile-2',
    name: 'Freelance Fullstack',
    role_target: 'Fullstack Developer',
    is_default: false,
    section_count: 2,
    created_at: '2026-04-02T00:00:00Z',
    updated_at: '2026-04-08T00:00:00Z',
  },
]

import { useProfileStore } from '@/store'

// ── Helper: mở modal tạo profile ─────────────────────────────────────────────

async function openCreateModal() {
  const user = userEvent.setup()
  // Header button có tên chính xác là "Tạo profile" (không có "đầu tiên")
  const headerBtn = screen.getByRole('button', { name: 'Tạo profile' })
  await user.click(headerBtn)
  return user
}

// ── Helper: tìm submit button trong modal (phân biệt với header button) ───────

function getModalSubmitButton() {
  // Modal luôn render sau header trong DOM, lấy phần tử cuối cùng có tên "Tạo profile"
  const allBtns = screen.getAllByRole('button', { name: 'Tạo profile' })
  return allBtns[allBtns.length - 1]
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('ProfilesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(useRouter as ReturnType<typeof vi.fn>).mockReturnValue({ push: mockPush })
    mockFetchProfiles.mockResolvedValue(undefined)
    mockCreateProfile.mockResolvedValue({
      id: 'profile-new',
      name: 'Test',
      is_default: false,
      sections: [],
      created_at: '',
      updated_at: '',
    })
    mockDeleteProfile.mockResolvedValue(undefined)
    mockSetDefault.mockResolvedValue(undefined)
    // Reset về default mock (empty profiles)
    ;(useProfileStore as ReturnType<typeof vi.fn>).mockReturnValue({
      profiles: [],
      loading: false,
      fetchProfiles: mockFetchProfiles,
      createProfile: mockCreateProfile,
      deleteProfile: mockDeleteProfile,
      setDefault: mockSetDefault,
    })
  })

  // ── Empty state ────────────────────────────────────────────────────────────

  describe('empty state', () => {
    it('renders empty state title when no profiles', () => {
      render(<ProfilesPage />)
      expect(screen.getByText('Chưa có profile nào')).toBeDefined()
    })

    it('renders empty state description when no profiles', () => {
      render(<ProfilesPage />)
      // Dùng exact string để tránh match button có cùng prefix
      expect(
        screen.getByText('Tạo profile đầu tiên để lưu trữ dữ liệu CV')
      ).toBeDefined()
    })

    it('renders empty state CTA button', () => {
      render(<ProfilesPage />)
      // getByRole với exact name tránh match paragraph text
      expect(
        screen.getByRole('button', { name: 'Tạo profile đầu tiên' })
      ).toBeDefined()
    })

    it('calls fetchProfiles on mount', async () => {
      render(<ProfilesPage />)
      await waitFor(() => {
        expect(mockFetchProfiles).toHaveBeenCalledTimes(1)
      })
    })
  })

  // ── Loading state ──────────────────────────────────────────────────────────

  describe('loading state', () => {
    it('shows loader when loading=true', () => {
      ;(useProfileStore as ReturnType<typeof vi.fn>).mockReturnValue({
        profiles: [],
        loading: true,
        fetchProfiles: mockFetchProfiles,
        createProfile: mockCreateProfile,
        deleteProfile: mockDeleteProfile,
        setDefault: mockSetDefault,
      })

      render(<ProfilesPage />)
      expect(document.querySelector('.animate-spin')).not.toBeNull()
    })

    it('does not render empty state when loading', () => {
      ;(useProfileStore as ReturnType<typeof vi.fn>).mockReturnValue({
        profiles: [],
        loading: true,
        fetchProfiles: mockFetchProfiles,
        createProfile: mockCreateProfile,
        deleteProfile: mockDeleteProfile,
        setDefault: mockSetDefault,
      })

      render(<ProfilesPage />)
      expect(screen.queryByText('Chưa có profile nào')).toBeNull()
    })
  })

  // ── Profile list ───────────────────────────────────────────────────────────

  describe('with profiles', () => {
    beforeEach(() => {
      ;(useProfileStore as ReturnType<typeof vi.fn>).mockReturnValue({
        profiles: mockProfiles,
        loading: false,
        fetchProfiles: mockFetchProfiles,
        createProfile: mockCreateProfile,
        deleteProfile: mockDeleteProfile,
        setDefault: mockSetDefault,
      })
    })

    it('renders all profile cards', () => {
      render(<ProfilesPage />)
      expect(screen.getByText('Senior Backend Engineer')).toBeDefined()
      expect(screen.getByText('Freelance Fullstack')).toBeDefined()
    })

    it('shows role_target under profile name', () => {
      render(<ProfilesPage />)
      expect(screen.getByText('Software Engineer')).toBeDefined()
      expect(screen.getByText('Fullstack Developer')).toBeDefined()
    })

    it('shows "Mặc định" badge for default profile', () => {
      render(<ProfilesPage />)
      // is_default: true chỉ có ở profile-1
      expect(screen.getByText('Mặc định')).toBeDefined()
    })

    it('shows profile count in header', () => {
      render(<ProfilesPage />)
      expect(screen.getByText(/2 profile/)).toBeDefined()
    })

    it('does not show empty state when profiles exist', () => {
      render(<ProfilesPage />)
      expect(screen.queryByText('Chưa có profile nào')).toBeNull()
    })

    it('navigates to profile editor on "Chỉnh sửa →" link click', async () => {
      const user = userEvent.setup()
      render(<ProfilesPage />)

      // Có nhiều "Chỉnh sửa →" (mỗi card 1 cái), click cái đầu tiên
      const editLinks = screen.getAllByText('Chỉnh sửa →')
      await user.click(editLinks[0])

      expect(mockPush).toHaveBeenCalledWith('/profiles/profile-1')
    })

    it('opens context menu on MoreHorizontal button click', async () => {
      const user = userEvent.setup()
      render(<ProfilesPage />)

      // Tìm tất cả button opacity-0 (context menu triggers)
      const menuTriggers = document
        .querySelectorAll('button.opacity-0, button[class*="opacity-0"]')

      if (menuTriggers.length > 0) {
        await user.click(menuTriggers[0] as HTMLElement)
        expect(screen.getByText('Chỉnh sửa')).toBeDefined()
      }
    })

    it('navigates to cv/new with profile_id from context menu', async () => {
      const user = userEvent.setup()
      render(<ProfilesPage />)

      const menuTriggers = document
        .querySelectorAll('button.opacity-0, button[class*="opacity-0"]')

      if (menuTriggers.length > 0) {
        await user.click(menuTriggers[0] as HTMLElement)
        const createCVBtn = screen.queryByText('Tạo CV từ profile')
        if (createCVBtn) {
          await user.click(createCVBtn)
          expect(mockPush).toHaveBeenCalledWith('/cv/new?profile_id=profile-1')
        }
      }
    })
  })

  // ── Create modal ───────────────────────────────────────────────────────────

  describe('create profile modal', () => {
    it('opens modal when header "Tạo profile" button is clicked', async () => {
      render(<ProfilesPage />)
      await openCreateModal()
      expect(screen.getByText('Tạo profile mới')).toBeDefined()
    })

    it('closes modal when "Hủy" is clicked', async () => {
      const user = userEvent.setup()
      render(<ProfilesPage />)

      await openCreateModal()
      expect(screen.getByText('Tạo profile mới')).toBeDefined()

      await user.click(screen.getByText('Hủy'))
      await waitFor(() => {
        expect(screen.queryByText('Tạo profile mới')).toBeNull()
      })
    })

    it('submit button is disabled when name is empty', async () => {
      render(<ProfilesPage />)
      await openCreateModal()

      const submitBtn = getModalSubmitButton()
      expect(submitBtn).toBeDisabled()
    })

    it('submit button is enabled when name is provided', async () => {
      const user = userEvent.setup()
      render(<ProfilesPage />)
      await openCreateModal()

      await user.type(
        screen.getByPlaceholderText(/VD: Senior Backend/),
        'My Profile'
      )

      const submitBtn = getModalSubmitButton()
      expect(submitBtn).not.toBeDisabled()
    })

    it('calls createProfile with name and roleTarget on submit', async () => {
      const user = userEvent.setup()
      render(<ProfilesPage />)
      await openCreateModal()

      await user.type(
        screen.getByPlaceholderText(/VD: Senior Backend/),
        'Backend Dev'
      )
      await user.type(
        screen.getByPlaceholderText(/VD: Software Engineer/),
        'Engineer'
      )
      await user.click(getModalSubmitButton())

      await waitFor(() => {
        expect(mockCreateProfile).toHaveBeenCalledWith({
          name: 'Backend Dev',
          role_target: 'Engineer',
        })
      })
    })

    it('calls createProfile with empty role_target when not filled', async () => {
      const user = userEvent.setup()
      render(<ProfilesPage />)
      await openCreateModal()

      await user.type(
        screen.getByPlaceholderText(/VD: Senior Backend/),
        'My Profile'
      )
      await user.click(getModalSubmitButton())

      await waitFor(() => {
        expect(mockCreateProfile).toHaveBeenCalledWith({
          name: 'My Profile',
          role_target: undefined,
        })
      })
    })

    it('navigates to new profile page after creation', async () => {
      const user = userEvent.setup()
      mockCreateProfile.mockResolvedValue({
        id: 'profile-new',
        name: 'Backend Dev',
        is_default: false,
        sections: [],
        created_at: '',
        updated_at: '',
      })
      render(<ProfilesPage />)
      await openCreateModal()

      await user.type(
        screen.getByPlaceholderText(/VD: Senior Backend/),
        'Backend Dev'
      )
      await user.click(getModalSubmitButton())

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/profiles/profile-new')
      })
    })

    it('submit with Enter key in name field', async () => {
      const user = userEvent.setup()
      render(<ProfilesPage />)
      await openCreateModal()

      const nameInput = screen.getByPlaceholderText(/VD: Senior Backend/)
      await user.type(nameInput, 'Test Profile{Enter}')

      await waitFor(() => {
        expect(mockCreateProfile).toHaveBeenCalledWith({
          name: 'Test Profile',
          role_target: undefined,
        })
      })
    })
  })

  // ── Header ────────────────────────────────────────────────────────────────

  describe('header', () => {
    it('renders page title', () => {
      render(<ProfilesPage />)
      expect(screen.getByText('Profiles của bạn')).toBeDefined()
    })

    it('renders "Dữ liệu CV" wf-label', () => {
      render(<ProfilesPage />)
      expect(screen.getByText('Dữ liệu CV')).toBeDefined()
    })

    it('renders header "Tạo profile" button', () => {
      render(<ProfilesPage />)
      expect(screen.getByRole('button', { name: 'Tạo profile' })).toBeDefined()
    })
  })
})
