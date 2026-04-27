import { api } from './client';
import type { Referral, ReferralStatus, ReferralFormData } from '../types';

export const referralsApi = {
  /** Authenticated — list referrals filtered by status */
  list: (status?: ReferralStatus) => {
    const qs = status ? `?status=${status}` : '';
    return api.get<Referral[]>(`/referrals${qs}`);
  },

  getById: (id: number) =>
    api.get<Referral>(`/referrals/${id}`),

  assign: (id: number, counsellorId: number) =>
    api.patch<Referral>(`/referrals/${id}/assign`, { counsellorId }),

  unassign: (id: number) =>
    api.patch<Referral>(`/referrals/${id}/assign`, { counsellorId: null }),

  /** Soft-delete — reason is required */
  remove: (id: number, reason: string) =>
    api.delete<void>(`/referrals/${id}`, { reason }),

  /** Public — no auth required */
  submitPublic: (tenantCode: string, data: ReferralFormData) =>
    api.post<{ id: number }>(`/public/referrals/${tenantCode}`, data),
};
