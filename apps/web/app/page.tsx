'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { StatusCard } from '@/components/status-card';
import { EventTimeline } from '@/components/event-timeline';
import { DanmakuChart } from '@/components/danmaku-chart';
import { LlmInsight } from '@/components/llm-insight';
import { useSse } from '@/hooks/use-sse';
import { apiClient } from '@/lib/api-client';
import type { MonitorEvent, RoomInfo, LlmAnalysisEvent } from '@bilibili-monitor/shared';

interface DanmakuBucket {
  time: string;
  count: number;
}

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000';

export default function DashboardPage() {
  const [streamInfo, setStreamInfo] = useState<RoomInfo | null>(null);
  const [events, setEvents] = useState<MonitorEvent[]>([]);
  const [analysis, setAnalysis] = useState<LlmAnalysisEvent | null>(null);
  const [danmakuBuckets, setDanmakuBuckets] = useState<DanmakuBucket[]>([]);
  const [wsConnected, setWsConnected] = useState(false);

  const bucketRef = useRef<Map<string, number>>(new Map());

  const addDanmakuToBucket = useCallback((timestamp: number) => {
    const minute = new Date(timestamp).toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
    });
    bucketRef.current.set(minute, (bucketRef.current.get(minute) ?? 0) + 1);

    // Keep last 30 minutes
    const entries = Array.from(bucketRef.current.entries()).slice(-30);
    bucketRef.current = new Map(entries);
    setDanmakuBuckets(entries.map(([time, count]) => ({ time, count })));
  }, []);

  // SSE subscription
  const { connected } = useSse(`${BACKEND_URL}/sse`, {
    onEvent: useCallback(
      (data: { type: string } & Record<string, unknown>) => {
        if (data.type === 'danmaku') {
          addDanmakuToBucket((data.timestamp as number) ?? Date.now());
          return;
        }
        if (data.type === 'connected') return;

        // It's a MonitorEvent
        const event = data as unknown as MonitorEvent;
        setEvents((prev) => [event, ...prev].slice(0, 100));

        if (event.type === 'llm_analysis') {
          setAnalysis(event as LlmAnalysisEvent);
        }
        if (event.type === 'stream_start' || event.type === 'stream_stop') {
          refreshStreamInfo();
        }
      },
      [addDanmakuToBucket],
    ),
  });

  const refreshStreamInfo = useCallback(async () => {
    try {
      const info = await apiClient.getStreamStatus();
      setStreamInfo(info);
    } catch (e) {
      console.error('Failed to fetch stream status', e);
    }
  }, []);

  // Initial data load
  useEffect(() => {
    refreshStreamInfo();

    apiClient
      .getEvents({ limit: 50 })
      .then(({ events }) => setEvents(events))
      .catch(console.error);

    apiClient
      .getLatestAnalysis()
      .then(setAnalysis)
      .catch(() => {}); // 404 is expected

    apiClient
      .getHealth()
      .then(({ wsConnected }) => setWsConnected(wsConnected))
      .catch(console.error);
  }, [refreshStreamInfo]);

  // Refresh stream info every 30s
  useEffect(() => {
    const timer = setInterval(refreshStreamInfo, 30_000);
    return () => clearInterval(timer);
  }, [refreshStreamInfo]);

  return (
    <main className="container mx-auto p-4 space-y-4 max-w-6xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Bilibili 直播监控</h1>
        <div className="text-sm text-muted-foreground">
          SSE {connected ? '已连接' : '未连接'}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <StatusCard info={streamInfo} wsConnected={wsConnected} />
          <DanmakuChart data={danmakuBuckets} />
          <LlmInsight analysis={analysis} />
        </div>
        <div className="lg:col-span-1">
          <EventTimeline events={events} />
        </div>
      </div>
    </main>
  );
}
