import apiClient from './client'
import type {
  CVProfile,
  CVProfileListItem,
  ProfileSection,
  ProfileItem,
  CreateProfileRequest,
  UpdateProfileRequest,
  CreateSectionRequest,
  UpdateSectionRequest,
  ReorderRequest,
  CreateItemRequest,
  UpdateItemRequest,
} from '@/types'

// Backend có thể trả plain array hoặc paginated { data: [...] }
type ListResponse = CVProfileListItem[] | { data: CVProfileListItem[] }

function extractArray(res: ListResponse): CVProfileListItem[] {
  if (Array.isArray(res)) return res
  if (res && Array.isArray((res as { data: CVProfileListItem[] }).data)) {
    return (res as { data: CVProfileListItem[] }).data
  }
  return []
}

export const profileApi = {
  // ── Profiles ──────────────────────────────────────────────────────────────

  list: (): Promise<CVProfileListItem[]> =>
    apiClient
      .get<ListResponse>('/profiles')
      .then((r) => extractArray(r.data)),

  get: (id: string): Promise<CVProfile> =>
    apiClient.get<CVProfile>(`/profiles/${id}`).then((r) => r.data),

  create: (body: CreateProfileRequest): Promise<CVProfile> =>
    apiClient.post<CVProfile>('/profiles', body).then((r) => r.data),

  update: (id: string, body: UpdateProfileRequest): Promise<CVProfile> =>
    apiClient.put<CVProfile>(`/profiles/${id}`, body).then((r) => r.data),

  delete: (id: string): Promise<void> =>
    apiClient.delete(`/profiles/${id}`).then(() => undefined),

  setDefault: (id: string): Promise<void> =>
    apiClient.patch(`/profiles/${id}/default`).then(() => undefined),

  // ── Sections ──────────────────────────────────────────────────────────────

  listSections: (profileId: string): Promise<ProfileSection[]> =>
    apiClient.get<ProfileSection[]>(`/profiles/${profileId}/sections`).then((r) => r.data),

  createSection: (profileId: string, body: CreateSectionRequest): Promise<ProfileSection> =>
    apiClient.post<ProfileSection>(`/profiles/${profileId}/sections`, body).then((r) => r.data),

  updateSection: (
    profileId: string,
    sectionId: string,
    body: UpdateSectionRequest
  ): Promise<ProfileSection> =>
    apiClient
      .put<ProfileSection>(`/profiles/${profileId}/sections/${sectionId}`, body)
      .then((r) => r.data),

  deleteSection: (profileId: string, sectionId: string): Promise<void> =>
    apiClient.delete(`/profiles/${profileId}/sections/${sectionId}`).then(() => undefined),

  reorderSections: (profileId: string, body: ReorderRequest): Promise<void> =>
    apiClient.patch(`/profiles/${profileId}/sections/reorder`, body).then(() => undefined),

  // ── Items ─────────────────────────────────────────────────────────────────

  createItem: (
    profileId: string,
    sectionId: string,
    body: CreateItemRequest
  ): Promise<ProfileItem> =>
    apiClient
      .post<ProfileItem>(`/profiles/${profileId}/sections/${sectionId}/items`, body)
      .then((r) => r.data),

  updateItem: (
    profileId: string,
    sectionId: string,
    itemId: string,
    body: UpdateItemRequest
  ): Promise<ProfileItem> =>
    apiClient
      .put<ProfileItem>(`/profiles/${profileId}/sections/${sectionId}/items/${itemId}`, body)
      .then((r) => r.data),

  deleteItem: (profileId: string, sectionId: string, itemId: string): Promise<void> =>
    apiClient
      .delete(`/profiles/${profileId}/sections/${sectionId}/items/${itemId}`)
      .then(() => undefined),

  reorderItems: (
    profileId: string,
    sectionId: string,
    body: ReorderRequest
  ): Promise<void> =>
    apiClient
      .patch(`/profiles/${profileId}/sections/${sectionId}/items/reorder`, body)
      .then(() => undefined),
}
