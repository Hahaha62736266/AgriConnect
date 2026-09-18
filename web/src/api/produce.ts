import { apiClient } from './index';
import type {
  CreateProduceListingPayload,
  CreateProduceTransactionPayload,
  ProduceListing,
  ProduceTransaction,
  TransactionStatus,
} from '../types/produce';

export interface ProduceFilterOptions {
  cropName?: string;
  category?: string;
  location?: string;
  minPrice?: number;
  maxPrice?: number;
  status?: string;
  farmerId?: string;
}

export const produceApi = {
  listListings: async (options?: ProduceFilterOptions): Promise<ProduceListing[]> => {
    const params = new URLSearchParams();
    if (options?.cropName) params.append('cropName', options.cropName);
    if (options?.category) params.append('category', options.category);
    if (options?.location) params.append('location', options.location);
    if (options?.minPrice !== undefined && options.minPrice > 0) params.append('minPrice', options.minPrice.toString());
    if (options?.maxPrice !== undefined && options.maxPrice > 0) params.append('maxPrice', options.maxPrice.toString());
    if (options?.status) params.append('status', options.status);
    if (options?.farmerId) params.append('farmerId', options.farmerId);

    const res = await apiClient.get<ProduceListing[]>(`/api/produce/listings?${params.toString()}`);
    return res.data;
  },

  getListingByID: async (id: string): Promise<ProduceListing> => {
    const res = await apiClient.get<ProduceListing>(`/api/produce/listings/${id}`);
    return res.data;
  },

  createListing: async (payload: CreateProduceListingPayload): Promise<ProduceListing> => {
    const res = await apiClient.post<ProduceListing>('/api/produce/listings', payload);
    return res.data;
  },

  updateListing: async (id: string, payload: Partial<CreateProduceListingPayload>): Promise<ProduceListing> => {
    const res = await apiClient.put<ProduceListing>(`/api/produce/listings/${id}`, payload);
    return res.data;
  },

  deleteListing: async (id: string): Promise<{ message: string }> => {
    const res = await apiClient.delete<{ message: string }>(`/api/produce/listings/${id}`);
    return res.data;
  },

  initiateTransaction: async (payload: CreateProduceTransactionPayload): Promise<ProduceTransaction> => {
    const res = await apiClient.post<ProduceTransaction>('/api/produce/transactions', payload);
    return res.data;
  },

  listTransactions: async (): Promise<ProduceTransaction[]> => {
    const res = await apiClient.get<ProduceTransaction[]>('/api/produce/transactions');
    return res.data;
  },

  updateTransactionStatus: async (
    id: string,
    status: TransactionStatus,
    shippingFee?: number,
    paymentStatus?: string,
    paymentRefNo?: string,
    paymentProofUrl?: string
  ): Promise<ProduceTransaction> => {
    const res = await apiClient.put<ProduceTransaction>(`/api/produce/transactions/${id}/status`, {
      status,
      shippingFee,
      paymentStatus,
      paymentRefNo,
      paymentProofUrl,
    });
    return res.data;
  },

  submitPaymentRef: async (id: string, paymentRefNo: string, paymentProofUrl?: string): Promise<ProduceTransaction> => {
    const res = await apiClient.put<ProduceTransaction>(`/api/produce/transactions/${id}/status`, {
      paymentRefNo,
      paymentProofUrl,
      paymentStatus: 'pending_verification',
    });
    return res.data;
  },

  respondToQuote: async (id: string, action: 'approve' | 'switch_pickup' | 'reject'): Promise<ProduceTransaction> => {
    const res = await apiClient.post<ProduceTransaction>(`/api/produce/transactions/${id}/quote-decision`, { action });
    return res.data;
  },
};
