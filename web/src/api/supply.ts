import { apiClient } from './index';
import type {
  CreateSupplyOrderPayload,
  CreateSupplyProductPayload,
  SupplyOrder,
  SupplyOrderStatus,
  SupplyProduct,
  UpdatePaymentStatusPayload,
} from '../types/supply';

export interface SupplyFilterOptions {
  category?: string;
  q?: string;
  supplierId?: string;
}

export const supplyApi = {
  listProducts: async (options?: SupplyFilterOptions): Promise<SupplyProduct[]> => {
    const params = new URLSearchParams();
    if (options?.category) params.append('category', options.category);
    if (options?.q) params.append('q', options.q);
    if (options?.supplierId) params.append('supplierId', options.supplierId);

    const res = await apiClient.get<SupplyProduct[]>(`/api/supply/products?${params.toString()}`);
    return res.data;
  },

  getProductByID: async (id: string): Promise<SupplyProduct> => {
    const res = await apiClient.get<SupplyProduct>(`/api/supply/products/${id}`);
    return res.data;
  },

  createProduct: async (payload: CreateSupplyProductPayload): Promise<SupplyProduct> => {
    const res = await apiClient.post<SupplyProduct>('/api/supply/products', payload);
    return res.data;
  },

  updateProduct: async (id: string, payload: Partial<CreateSupplyProductPayload>): Promise<SupplyProduct> => {
    const res = await apiClient.put<SupplyProduct>(`/api/supply/products/${id}`, payload);
    return res.data;
  },

  deleteProduct: async (id: string): Promise<{ message: string }> => {
    const res = await apiClient.delete<{ message: string }>(`/api/supply/products/${id}`);
    return res.data;
  },

  createOrder: async (payload: CreateSupplyOrderPayload): Promise<SupplyOrder> => {
    const res = await apiClient.post<SupplyOrder>('/api/supply/orders', payload);
    return res.data;
  },

  listOrders: async (): Promise<SupplyOrder[]> => {
    const res = await apiClient.get<SupplyOrder[]>('/api/supply/orders');
    return res.data;
  },

  updateOrderStatus: async (id: string, status: SupplyOrderStatus, shippingFee?: number): Promise<SupplyOrder> => {
    const res = await apiClient.put<SupplyOrder>(`/api/supply/orders/${id}/status`, { status, shippingFee });
    return res.data;
  },

  /**
   * updatePaymentStatus — confirms/updates the payment state of a supply order.
   * Suppliers call this for COD (cash collected on delivery).
   * Future: online payment gateway webhook will also call this.
   */
  updatePaymentStatus: async (id: string, payload: UpdatePaymentStatusPayload): Promise<SupplyOrder> => {
    const res = await apiClient.put<SupplyOrder>(`/api/supply/orders/${id}/payment-status`, payload);
    return res.data;
  },

  respondToQuote: async (id: string, action: 'approve' | 'switch_pickup' | 'reject'): Promise<SupplyOrder> => {
    const res = await apiClient.post<SupplyOrder>(`/api/supply/orders/${id}/quote-decision`, { action });
    return res.data;
  },

  submitPaymentRef: async (id: string, paymentRefNo: string, paymentProofUrl?: string): Promise<SupplyOrder> => {
    const res = await apiClient.put<SupplyOrder>(`/api/supply/orders/${id}/payment-ref`, {
      paymentRefNo,
      paymentProofUrl,
    });
    return res.data;
  },
};
