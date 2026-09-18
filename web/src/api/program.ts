import { apiClient } from './index';
import { withCache, clientCache } from '../utils/cache';
import type {
  CreateProgramPayload,
  GovernmentProgram,
  ProgramApplication,
  ReviewApplicationPayload,
  SubmitApplicationPayload,
} from '../types/program';

export const programApi = {
  listPrograms: async (status?: string, municipality?: string, exact?: boolean): Promise<GovernmentProgram[]> => {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    if (municipality) params.append('municipality', municipality);
    if (exact) params.append('exact', 'true');

    const cacheKey = `gov_programs_${params.toString()}`;
    return withCache(cacheKey, async () => {
      const res = await apiClient.get<GovernmentProgram[]>(`/api/programs?${params.toString()}`);
      return res.data;
    }, 60_000);
  },

  getProgramByID: async (id: string): Promise<GovernmentProgram> => {
    return withCache(`gov_program_${id}`, async () => {
      const res = await apiClient.get<GovernmentProgram>(`/api/programs/${id}`);
      return res.data;
    }, 60_000);
  },

  createProgram: async (payload: CreateProgramPayload): Promise<GovernmentProgram> => {
    const res = await apiClient.post<GovernmentProgram>('/api/programs', payload);
    clientCache.invalidate('gov_program');
    return res.data;
  },

  updateProgramStatus: async (id: string, status: 'open' | 'closed'): Promise<void> => {
    await apiClient.put(`/api/programs/${id}/status`, { status });
    clientCache.invalidate('gov_program');
  },

  submitApplication: async (programId: string, payload: SubmitApplicationPayload): Promise<ProgramApplication> => {
    const res = await apiClient.post<ProgramApplication>(`/api/programs/${programId}/applications`, payload);
    return res.data;
  },

  listMyApplications: async (): Promise<ProgramApplication[]> => {
    const res = await apiClient.get<ProgramApplication[]>('/api/programs/applications/my');
    return res.data;
  },

  listProgramApplications: async (programId: string): Promise<ProgramApplication[]> => {
    const res = await apiClient.get<ProgramApplication[]>(`/api/programs/${programId}/applications`);
    return res.data;
  },

  reviewApplication: async (appId: string, payload: ReviewApplicationPayload): Promise<void> => {
    await apiClient.put(`/api/programs/applications/${appId}/status`, payload);
  },
};
