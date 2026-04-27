import { api } from './client';
import type { LoginResponse, Tenant } from '../types';

export const authApi = {
  login: (email: string, password: string) =>
    api.post<LoginResponse>('/auth/login', { email, password }),

  logout: () =>
    api.post<void>('/auth/logout', {}),

  /** Called by the public referral form to verify a tenant exists */
  getPublicTenant: (tenantCode: string) =>
    api.get<Tenant>(`/public/tenants/${tenantCode}`),
};
