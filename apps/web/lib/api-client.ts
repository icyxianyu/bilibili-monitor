const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000';

async function apiFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${BACKEND_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    cache: 'no-store',
  });
  if (!res.ok) {
    throw new Error(`API error ${res.status}: ${path}`);
  }
  return res.json() as Promise<T>;
}

import type { RoomInfo, MonitorEvent, DanmakuRecord, LlmAnalysisEvent } from '@bilibili-monitor/shared';

export const apiClient = {
  getStreamStatus: () => apiFetch<RoomInfo>('/api/stream/status'),
  getEvents: (params?: { limit?: number; offset?: number; type?: string }) => {
    const qs = new URLSearchParams();
    if (params?.limit) qs.set('limit', String(params.limit));
    if (params?.offset) qs.set('offset', String(params.offset));
    if (params?.type) qs.set('type', params.type);
    return apiFetch<{ events: MonitorEvent[]; limit: number; offset: number }>(
      `/api/events?${qs.toString()}`,
    );
  },
  getDanmaku: (params?: { since?: number; limit?: number }) => {
    const qs = new URLSearchParams();
    if (params?.since) qs.set('since', String(params.since));
    if (params?.limit) qs.set('limit', String(params.limit));
    return apiFetch<{ danmaku: DanmakuRecord[] }>(`/api/danmaku?${qs.toString()}`);
  },
  getLatestAnalysis: () => apiFetch<LlmAnalysisEvent>('/api/analysis/latest'),
  getHealth: () => apiFetch<{ status: string; wsConnected: boolean; roomId: number }>('/health'),
};
