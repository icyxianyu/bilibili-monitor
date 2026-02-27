const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000';

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BACKEND_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    cache: 'no-store',
    ...init,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(body.error ?? `API error ${res.status}: ${path}`);
  }
  return res.json() as Promise<T>;
}

import type { RoomInfo, MonitorEvent, DanmakuRecord, LlmAnalysisEvent } from '@bilibili-monitor/shared';

export const apiClient = {
  getStreamStatus: async (roomId: number): Promise<RoomInfo | null> => {
    const res = await fetch(`${BACKEND_URL}/api/rooms/${roomId}/stream/status`, {
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
    });
    if (res.status === 503) return null; // poller not ready yet
    if (!res.ok) {
      const body = await res.json().catch(() => ({})) as { error?: string };
      throw new Error(body.error ?? `API error ${res.status}`);
    }
    return res.json() as Promise<RoomInfo>;
  },
  getEvents: (roomId: number, params?: { limit?: number; offset?: number; type?: string; date?: string }) => {
    const qs = new URLSearchParams();
    if (params?.limit) qs.set('limit', String(params.limit));
    if (params?.offset) qs.set('offset', String(params.offset));
    if (params?.type) qs.set('type', params.type);
    if (params?.date) qs.set('date', params.date);
    return apiFetch<{ events: MonitorEvent[]; limit: number; offset: number; total: number }>(
      `/api/rooms/${roomId}/events?${qs.toString()}`,
    );
  },
  getDanmaku: (roomId: number, params?: { since?: number; until?: number; limit?: number }) => {
    const qs = new URLSearchParams();
    if (params?.since) qs.set('since', String(params.since));
    if (params?.until) qs.set('until', String(params.until));
    if (params?.limit) qs.set('limit', String(params.limit));
    return apiFetch<{ danmaku: DanmakuRecord[] }>(`/api/rooms/${roomId}/danmaku?${qs.toString()}`);
  },
  getDanmakuBuckets: (roomId: number, params?: { since?: number; until?: number }) => {
    const qs = new URLSearchParams();
    if (params?.since) qs.set('since', String(params.since));
    if (params?.until) qs.set('until', String(params.until));
    return apiFetch<{ buckets: { minuteTs: number; minute: string; count: number }[] }>(`/api/rooms/${roomId}/danmaku/buckets?${qs.toString()}`);
  },
  getEarliestDanmaku: (roomId: number) =>
    apiFetch<{ timestamp: number | null }>(`/api/rooms/${roomId}/danmaku/earliest`),
  getLatestAnalysis: (roomId: number) => apiFetch<LlmAnalysisEvent>(`/api/rooms/${roomId}/analysis/latest`),
  triggerManualAnalysis: (roomId: number, params: { since: number; until: number }) =>
    apiFetch<LlmAnalysisEvent>(`/api/rooms/${roomId}/analysis/manual`, {
      method: 'POST',
      body: JSON.stringify(params),
    }),
  getHealth: () => apiFetch<{ status: string; wsConnected: boolean; roomId: number | null }>('/health'),
};
