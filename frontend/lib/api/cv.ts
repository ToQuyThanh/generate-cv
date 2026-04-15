import apiClient from './client'
import type {
  CV,
  CVListItem,
  CreateCVRequest,
  UpdateCVRequest,
  PaginatedResponse,
} from '@/types'

// Backend dùng per_page (không phải limit)
export const cvApi = {
  list: (page = 1, perPage = 12) =>
    apiClient
      .get<PaginatedResponse<CVListItem>>('/cvs', { params: { page, per_page: perPage } })
      .then((r) => r.data),

  get: (id: string) =>
    apiClient.get<CV>(`/cvs/${id}`).then((r) => r.data),

  create: (body: CreateCVRequest) =>
    apiClient.post<CV>('/cvs', body).then((r) => r.data),

  update: (id: string, body: UpdateCVRequest) =>
    apiClient.patch<CV>(`/cvs/${id}`, body).then((r) => r.data),

  delete: (id: string) =>
    apiClient.delete(`/cvs/${id}`),

  duplicate: (id: string) =>
    apiClient.post<CV>(`/cvs/${id}/duplicate`).then((r) => r.data),

  exportPDF: (id: string) =>
    apiClient.post<{ job_id: string }>(`/cvs/${id}/export`).then((r) => r.data),

  pollExport: (id: string, jobId: string) =>
    apiClient
      .get<{ status: 'pending' | 'processing' | 'done' | 'failed'; url?: string }>(
        `/cvs/${id}/export/${jobId}`
      )
      .then((r) => r.data),
}
