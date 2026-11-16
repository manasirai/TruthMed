import type { FactCheckResult, OrganDetail, OrganSummary } from '@/types';

const API_BASE = '/api/v1';
const CLIENT_ID_KEY = 'truthmed-client-id';

// Anonymous random ID for this browser. The backend uses it so each visitor only sees and deletes their own history.
let clientId: string | null = null;
function getClientId(): string {
  if (clientId) return clientId;
  try {
    clientId = localStorage.getItem(CLIENT_ID_KEY);
  } catch {
    // Storage blocked (private mode etc.): fall back to an ID for this session only
  }
  if (!clientId) {
    clientId = crypto.randomUUID();
    try {
      localStorage.setItem(CLIENT_ID_KEY, clientId);
    } catch {
      /* ignore */
    }
  }
  return clientId;
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', 'X-Client-Id': getClientId() },
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

    lookup: (claims: string[]) =>
      request<{ claim: string; result_id: string; verdict: string; verdict_label: string }[]>('/fact-check/lookup', {
        method: 'POST',
        body: JSON.stringify({ claims }),
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
