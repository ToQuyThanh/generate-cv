import apiClient from './client'
import type {
  CreatePaymentRequest,
  CreatePaymentResponse,
  PaymentHistoryResponse,
} from '@/types'

export const paymentApi = {
  // POST /payment/create — trả { transaction_id, payment_url }
  create: (body: CreatePaymentRequest) =>
    apiClient
      .post<CreatePaymentResponse>('/payment/create', body)
      .then((r) => r.data),

  // GET /payment/history — backend nhận page, page_size (không phải limit)
  // trả { data: [...], meta: { total, page, page_size } }
  history: (page = 1, pageSize = 10) =>
    apiClient
      .get<PaymentHistoryResponse>('/payment/history', {
        params: { page, page_size: pageSize },
      })
      .then((r) => r.data),
}
