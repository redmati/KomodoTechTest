import { api } from './client';
import type {
  CaseProfile,
  CaseProfileAccess,
  AccessLevel,
  CreateCaseProfileFormData,
} from '../types';

export const caseProfilesApi = {
  list: () =>
    api.get<CaseProfile[]>('/case-profiles'),

  getById: (id: number) =>
    api.get<CaseProfile>(`/case-profiles/${id}`),

  create: (data: CreateCaseProfileFormData) =>
    api.post<CaseProfile>('/case-profiles', data),

  update: (id: number, data: Partial<CreateCaseProfileFormData>) =>
    api.patch<CaseProfile>(`/case-profiles/${id}`, data),

  close: (id: number) =>
    api.patch<CaseProfile>(`/case-profiles/${id}`, { status: 'CLOSED' }),

  delete: (id: number) =>
    api.delete<void>(`/case-profiles/${id}`),

  // ─── Access management ────────────────────────────────────────────────────

  grantAccess: (profileId: number, userId: number, accessLevel: AccessLevel) =>
    api.post<CaseProfileAccess>(`/case-profiles/${profileId}/access`, {
      userId,
      accessLevel,
    }),

  revokeAccess: (profileId: number, userId: number) =>
    api.delete<void>(`/case-profiles/${profileId}/access/${userId}`),
};
