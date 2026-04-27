import { api } from './client';
import type { Appointment, AppointmentStatus, ScheduleAppointmentFormData } from '../types';

export const appointmentsApi = {
  list: (params?: { counsellorId?: number; from?: string; to?: string }) => {
    const qs = new URLSearchParams();
    if (params?.counsellorId) qs.set('counsellorId', String(params.counsellorId));
    if (params?.from) qs.set('from', params.from);
    if (params?.to) qs.set('to', params.to);
    const query = qs.toString() ? `?${qs.toString()}` : '';
    return api.get<Appointment[]>(`/appointments${query}`);
  },

  getById: (id: number) =>
    api.get<Appointment>(`/appointments/${id}`),

  create: (data: ScheduleAppointmentFormData) =>
    api.post<Appointment>('/appointments', data),

  updateStatus: (id: number, status: AppointmentStatus) =>
    api.patch<Appointment>(`/appointments/${id}`, { status }),

  update: (id: number, data: Partial<ScheduleAppointmentFormData>) =>
    api.patch<Appointment>(`/appointments/${id}`, data),

  delete: (id: number) =>
    api.delete<void>(`/appointments/${id}`),
};
