'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { StatusCard } from '@/components/status-card';
import { EventTimeline } from '@/components/event-timeline';
import { DanmakuChart } from '@/components/danmaku-chart';
import { LlmInsight } from '@/components/llm-insight';
import { RoomSidebar } from '@/components/room-sidebar';
import { useSse } from '@/hooks/use-sse';
import { useRoomHistory } from '@/hooks/use-room-history';
import { apiClient } from '@/lib/api-client';
import type { MonitorEvent, RoomInfo, LlmAnalysisEvent } from '@bilibili-monitor/shared';
import Link from 'next/link';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000';

export default function RoomPage() {
  const params = useParams();
  const router = useRouter();
  const roomId = Number(params['roomId']);

  const { history, addRoom, removeRoom } = useRoomHistory();

  const [streamInfo, setStreamInfo] = useState<RoomInfo | null>(null);
  const [liveEvents, setLiveEvents] = useState<MonitorEvent[]>([]);
  const [analysis, setAnalysis] = useState<LlmAnalysisEvent | null>(null);
  const [latestDanmakuTs, setLatestDanmakuTs] = useState<number | undefined>();
  const [wsConnected, setWsConnected] = useState(false);

  // Reset all room-specific state when roomId changes
  useEffect(() => {
    setStreamInfo(null);
    setLiveEvents([]);
    setAnalysis(null);
    setLatestDanmakuTs(undefined);
    setWsConnected(false);
  }, [roomId]);

  // Validate roomId
  useEffect(() => {
    if (!Number.isInteger(roomId) || roomId <= 0) {
      router.replace('/');
    } else {
      addRoom(roomId);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]);

  const refreshStreamInfo = useCallback(async () => {
    if (!roomId) return;
    try {
      const info = await apiClient.getStreamStatus(roomId);
      if (info !== null) {
        setStreamInfo(info);
      }
    } catch (e) {
      console.error('Failed to fetch stream status', e);
    }
  }, [roomId]);

  // Retry getting stream status while it's not available (poller may still be starting up)
  useEffect(() => {
    if (streamInfo !== null) return;
    const timer = setInterval(async () => {
      try {
        const info = await apiClient.getStreamStatus(roomId);
        if (info !== null) {
          setStreamInfo(info);
        }
      } catch {
        // ignore
      }
    }, 2_000);
    return () => clearInterval(timer);
  }, [roomId, streamInfo]);

  // SSE subscription
  const { connected } = useSse(`${BACKEND_URL}/sse/${roomId}`, {
    onEvent: useCallback(
      (data: { type: string } & Record<string, unknown>) => {
        if (data.type === 'danmaku') {
          setLatestDanmakuTs((data.timestamp as number) ?? Date.now());
          return;
        }
        if (data.type === 'connected') return;

        const event = data as unknown as MonitorEvent;
        setLiveEvents((prev) => [event, ...prev].slice(0, 100));

        if (event.type === 'llm_analysis') {
          setAnalysis(event as LlmAnalysisEvent);
        }
        if (event.type === 'stream_start' || event.type === 'stream_stop') {
          refreshStreamInfo();
        }
      },
      [refreshStreamInfo],
    ),
  });

  // Initial data load
  useEffect(() => {
    if (!roomId) return;
    refreshStreamInfo();

    apiClient
      .getLatestAnalysis(roomId)
      .then(setAnalysis)
      .catch(() => {});

    // Poll wsConnected status until it becomes true (WS may still be connecting)
    const healthTimer = setInterval(() => {
      apiClient
        .getHealth()
        .then(({ wsConnected: wsc }) => {
          setWsConnected(wsc);
          if (wsc) clearInterval(healthTimer);
        })
        .catch(() => clearInterval(healthTimer));
    }, 2_000);
    // immediate first call
    apiClient
      .getHealth()
      .then(({ wsConnected: wsc }) => {
        setWsConnected(wsc);
        if (wsc) clearInterval(healthTimer);
      })
      .catch(() => clearInterval(healthTimer));

    return () => clearInterval(healthTimer);
  }, [roomId, refreshStreamInfo]);

  // Refresh stream info every 30s
  useEffect(() => {
    const timer = setInterval(refreshStreamInfo, 30_000);
    return () => clearInterval(timer);
  }, [refreshStreamInfo]);

  if (!Number.isInteger(roomId) || roomId <= 0) {
    return null;
  }

  return (
    <main className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b bg-card/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-3 max-w-7xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-[hsl(var(--bili-pink))] to-[hsl(var(--bili-blue))]">
              <svg viewBox="0 0 24 24" className="w-4 h-4 text-white fill-current">
                <path d="M17.813 4.653h.854c1.51.054 2.769.578 3.773 1.574 1.004.995 1.524 2.249 1.56 3.76v7.36c-.036 1.51-.556 2.769-1.56 3.773s-2.262 1.524-3.773 1.56H5.333c-1.51-.036-2.769-.556-3.773-1.56S.036 18.858 0 17.347v-7.36c.036-1.511.556-2.765 1.56-3.76 1.004-.996 2.262-1.52 3.773-1.574h.774l-1.174-1.12a1.234 1.234 0 0 1-.373-.906c0-.356.124-.658.373-.907l.027-.027c.267-.249.573-.373.92-.373.347 0 .653.124.92.373L9.653 4.44c.071.071.134.142.187.213h4.267a.836.836 0 0 1 .16-.213l2.853-2.747c.267-.249.573-.373.92-.373.347 0 .662.151.929.4.267.249.391.551.391.907 0 .355-.124.657-.373.906zM5.333 7.24c-.746.018-1.373.276-1.88.773-.506.498-.769 1.13-.786 1.894v7.52c.017.764.28 1.395.786 1.893.507.498 1.134.756 1.88.773h13.334c.746-.017 1.373-.275 1.88-.773.506-.498.769-1.129.786-1.893v-7.52c-.017-.765-.28-1.396-.786-1.894-.507-.497-1.134-.755-1.88-.773zM8 11.107c.373 0 .684.124.933.373.25.249.374.56.374.933v2.134c0 .373-.125.684-.374.933-.249.249-.56.373-.933.373s-.684-.124-.933-.373c-.25-.249-.374-.56-.374-.933v-2.134c0-.373.125-.684.374-.933.249-.249.56-.373.933-.373zm8 0c.373 0 .684.124.933.373.25.249.374.56.374.933v2.134c0 .373-.125.684-.374.933-.249.249-.56.373-.933.373s-.684-.124-.933-.373c-.25-.249-.374-.56-.374-.933v-2.134c0-.373.125-.684.374-.933.249-.249.56-.373.933-.373z" />
              </svg>
            </Link>
            <div>
              <h1 className="text-base font-semibold tracking-tight leading-none">Bilibili 直播监控</h1>
              <p className="text-xs text-muted-foreground mt-0.5 tabular-nums">房间 {roomId}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span
              className={`inline-block w-1.5 h-1.5 rounded-full ${connected ? 'bg-green-500 animate-pulse' : 'bg-red-400'}`}
            />
            <span>SSE {connected ? '已连接' : '未连接'}</span>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="container mx-auto px-4 py-5 max-w-7xl">
        <div className="flex gap-6">
          {/* Sidebar */}
          <RoomSidebar history={history} onRemove={removeRoom} />

          {/* Main dashboard */}
          <div className="flex-1 min-w-0">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2 space-y-4">
                <StatusCard info={streamInfo} wsConnected={wsConnected} />
                <DanmakuChart roomId={roomId} latestDanmakuTs={latestDanmakuTs} />
                <LlmInsight roomId={roomId} analysis={analysis} onNewAnalysis={setAnalysis} />
              </div>
              <div className="lg:col-span-1">
                <EventTimeline roomId={roomId} liveEvents={liveEvents} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
