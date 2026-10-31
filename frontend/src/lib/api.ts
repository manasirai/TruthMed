import type { FactCheckResult, OrganDetail, OrganSummary } from '@/types';

const API_BASE = '/api/v1';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(body.detail ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  factCheck: {
    create: (claim: string, language = 'en', context_url?: string) =>
      request<FactCheckResult>('/fact-check', {
        method: 'POST',
        body: JSON.stringify({ claim, language, context_url }),
      }),

    getById: (id: string) => request<FactCheckResult>(`/fact-check/${id}`),

    getHistory: (page = 1, pageSize = 20) =>
      request<{ items: FactCheckResult[]; total: number; page: number; page_size: number }>(
        `/fact-check/history?page=${page}&page_size=${pageSize}`
      ),

    deleteHistoryItems: (ids: string[]) =>
      request<{ deleted: number }>('/fact-check/history/delete', {
        method: 'POST',
        body: JSON.stringify({ ids }),
      }),

    clearHistory: () => request<{ deleted: number }>('/fact-check/history', { method: 'DELETE' }),
  },

  organs: {
    list: () => request<OrganSummary[]>('/organs'),
    getById: (id: string) => request<OrganDetail>(`/organs/${id}`),
  },

  feedback: {
    submit: (result_id: string, rating: number, comment?: string) =>
      request('/feedback', {
        method: 'POST',
        body: JSON.stringify({ result_id, rating, comment }),
      }),
  },

  health: () => request<{ status: string; analysis_configured: boolean; retrieval_configured: boolean }>('/health'),
};
