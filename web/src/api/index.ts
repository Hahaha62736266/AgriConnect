import axios from 'axios';
import type { AuthResponse, LoginPayload, RegisterPayload, UpdateProfilePayload, User, PublicUserProfile } from '../types/auth';

const API_URL =
  import.meta.env.VITE_API_URL ||
  (typeof window !== 'undefined' ? '' : 'http://localhost:8080');

export const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach Authorization header if token exists
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('agriconnect_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

import { withCache, clientCache } from '../utils/cache';

// API helper methods
export const api = {
  // Auth
  register: async (payload: RegisterPayload): Promise<AuthResponse> => {
    const res = await apiClient.post<AuthResponse>('/api/auth/register', payload);
    return res.data;
  },
  login: async (payload: LoginPayload): Promise<AuthResponse> => {
    const res = await apiClient.post<AuthResponse>('/api/auth/login', payload);
    return res.data;
  },
  forgotPassword: async (email: string): Promise<{ message: string }> => {
    const res = await apiClient.post<{ message: string }>('/api/auth/forgot-password', { email });
    return res.data;
  },
  resetPassword: async (token: string, newPassword: string): Promise<{ message: string }> => {
    const res = await apiClient.post<{ message: string }>('/api/auth/reset-password', { token, newPassword });
    return res.data;
  },

  // Profile
  getProfile: async (): Promise<User> => {
    const res = await apiClient.get<User>('/api/users/me');
    return res.data;
  },
  getUserPublicProfile: async (id: string, bypassCache = false): Promise<PublicUserProfile> => {
    if (bypassCache) {
      clientCache.invalidate(`user_public_${id}`);
    }
    return withCache(`user_public_${id}`, async () => {
      const res = await apiClient.get<PublicUserProfile>(`/api/users/${id}/public`);
      return res.data;
    }, 60_000);
  },
  updateProfile: async (payload: UpdateProfilePayload): Promise<User> => {
    const res = await apiClient.put<User>('/api/users/me', payload);
    clientCache.invalidate('user_public');
    return res.data;
  },
  uploadPhoto: async (file: File): Promise<User> => {
    const formData = new FormData();
    formData.append('photo', file);
    const res = await apiClient.put<User>('/api/users/me/photo', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    clientCache.invalidate('user_public');
    return res.data;
  },
  uploadImage: async (file: File): Promise<{ url: string; filename: string }> => {
    const formData = new FormData();
    formData.append('image', file);
    const res = await apiClient.post<{ url: string; filename: string }>('/api/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },
  changePassword: async (currentPassword: string, newPassword: string): Promise<{ message: string }> => {
    const res = await apiClient.put<{ message: string }>('/api/users/me/password', {
      currentPassword,
      newPassword,
    });
    return res.data;
  },
  getSupportContacts: async (role?: string): Promise<User[]> => {
    const res = await apiClient.get<User[]>('/api/users/support-contacts', { params: { role } });
    return res.data;
  },
};

export const getImageUrl = (path?: string, fallback: string = ''): string => {
  if (!path) return fallback;
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:')) {
    return path;
  }
  return `${API_URL}${path.startsWith('/') ? '' : '/'}${path}`;
};

