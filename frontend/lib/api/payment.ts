import apiClient from './client'
import type {
  CreatePaymentRequest,
  CreatePaymentResponse,
  PaymentHistoryResponse,
} from '@/types'

export const paymentApi = {
  create: (body: CreatePaymentRequest) =>
    apiClient
      .post<CreatePaymentResponse>('/payment/create', body)
      .then((r) => r.data),

  history: (page = 1, limit = 10) =>
    apiClient
      .get<PaymentHistoryResponse>('/payment/history', { params: { page, limit } })
      .then((r) => r.data),
}
