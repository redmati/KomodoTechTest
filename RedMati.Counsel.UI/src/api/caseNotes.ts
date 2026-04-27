import { api } from './client';
import type { CaseNote, CreateCaseNoteFormData } from '../types';

export const caseNotesApi = {
  list: (profileId: number) =>
    api.get<CaseNote[]>(`/case-notes?profileId=${profileId}`),

  getById: (id: number) =>
    api.get<CaseNote>(`/case-notes/${id}`),

  create: (data: CreateCaseNoteFormData) =>
    api.post<CaseNote>('/case-notes', data),

  update: (id: number, content: string) =>
    api.patch<CaseNote>(`/case-notes/${id}`, { content }),

  delete: (id: number) =>
    api.delete<void>(`/case-notes/${id}`),
};
