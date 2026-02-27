'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { apiClient } from '@/lib/api-client';
import type { DanmakuRecord } from '@bilibili-monitor/shared';

const HOUR_MS = 60 * 60_000;
const MIN_MS = 60_000;

interface DanmakuDataPoint {
  minuteTs: number;
  minute: string;
  count: number;
}

interface DanmakuChartProps {
  roomId: number;
  latestDanmakuTs?: number;
}

function floorToHour(ts: number): number {
  return Math.floor(ts / HOUR_MS) * HOUR_MS;
}

function formatHourRange(since: number): string {
  const d = new Date(since);
  const end = new Date(since + HOUR_MS);
  const pad = (n: number) => String(n).padStart(2, '0');
  const dateStr = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  return `${dateStr} ${pad(d.getHours())}:00 – ${pad(end.getHours())}:00`;
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

// ─── Danmaku popup ────────────────────────────────────────────────────────────

function DanmakuPanel({
  roomId,
  minuteTs,
  minuteLabel,
  onClose,
}: {
  roomId: number;
  minuteTs: number;
  minuteLabel: string;
  onClose: () => void;
}) {
  const [danmaku, setDanmaku] = useState<DanmakuRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient
      .getDanmaku(roomId, { since: minuteTs, until: minuteTs + MIN_MS - 1, limit: 200 })
      .then(({ danmaku: items }) => setDanmaku(items))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [roomId, minuteTs]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-card rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md max-h-[70vh] flex flex-col shadow-2xl border"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3.5 border-b">
          <div>
            <p className="font-semibold text-sm">弹幕记录</p>
            <p className="text-xs text-muted-foreground mt-0.5 tabular-nums">{minuteLabel}</p>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4 fill-none stroke-current stroke-2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="overflow-y-auto flex-1 px-4 py-3">
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="inline-block w-3 h-3 rounded-full border-2 border-current border-t-transparent animate-spin" />
              加载中…
            </div>
          ) : danmaku.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">该分钟无弹幕记录</p>
          ) : (
            <ul className="space-y-2.5">
              {danmaku.map((d) => (
                <li key={d.id} className="flex gap-2 text-sm">
                  <time className="text-xs text-muted-foreground whitespace-nowrap pt-0.5 tabular-nums">
                    {formatTime(d.timestamp)}
                  </time>
                  <span className="text-xs font-medium text-primary/70 whitespace-nowrap pt-0.5">{d.username}</span>
                  <span className="flex-1 break-all text-foreground/80">{d.content}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Chart ────────────────────────────────────────────────────────────────────

export function DanmakuChart({ roomId, latestDanmakuTs }: DanmakuChartProps) {
  const nowHour = floorToHour(Date.now());

  const [windowStart, setWindowStart] = useState<number>(nowHour);
  const [earliestHour, setEarliestHour] = useState<number>(nowHour);
  const [data, setData] = useState<DanmakuDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<{ minuteTs: number; minuteLabel: string } | null>(null);

  const isLatestWindow = windowStart >= floorToHour(Date.now());

  useEffect(() => {
    apiClient.getEarliestDanmaku(roomId).then(({ timestamp }) => {
      if (timestamp != null) setEarliestHour(floorToHour(timestamp));
    }).catch(() => {});
  }, [roomId]);

  const load = useCallback((since: number) => {
    setLoading(true);
    const until = since + HOUR_MS - 1;
    apiClient
      .getDanmakuBuckets(roomId, { since, until })
      .then(({ buckets }) => setData(buckets))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [roomId]);

  useEffect(() => {
    load(windowStart);
  }, [windowStart, load]);

  const lastRefreshedTs = useRef<number>(0);
  useEffect(() => {
    if (!latestDanmakuTs || !isLatestWindow) return;
    if (latestDanmakuTs - lastRefreshedTs.current < 30_000) return;
    lastRefreshedTs.current = latestDanmakuTs;
    const currentHour = floorToHour(Date.now());
    setWindowStart((prev) => {
      if (prev !== currentHour) return currentHour;
      load(prev);
      return prev;
    });
  }, [latestDanmakuTs, isLatestWindow, load]);

  function goBack() { setWindowStart((prev) => prev - HOUR_MS); }
  function goForward() {
    setWindowStart((prev) => {
      const next = prev + HOUR_MS;
      return next > floorToHour(Date.now()) ? floorToHour(Date.now()) : next;
    });
  }

  const canGoBack = windowStart > earliestHour;
  const canGoForward = !isLatestWindow;
  const maxCount = data.length > 0 ? Math.max(...data.map((d) => d.count)) : 0;
  const totalCount = data.reduce((s, d) => s + d.count, 0);

  function handleChartClick(payload: { activePayload?: { payload: DanmakuDataPoint }[] } | null) {
    if (!payload?.activePayload?.[0]) return;
    const point = payload.activePayload[0].payload;
    if (!point.minuteTs || point.count === 0) return;
    setSelected({ minuteTs: point.minuteTs, minuteLabel: point.minute });
  }

  return (
    <>
      {selected && (
        <DanmakuPanel
          roomId={roomId}
          minuteTs={selected.minuteTs}
          minuteLabel={selected.minuteLabel}
          onClose={() => setSelected(null)}
        />
      )}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>弹幕热度</CardTitle>
            {totalCount > 0 && (
              <div className="flex items-center gap-3 text-xs text-muted-foreground tabular-nums">
                <span>峰值 {maxCount} 条/分钟</span>
                <span>共 {totalCount} 条</span>
              </div>
            )}
          </div>
          <div className="flex items-center justify-between mt-2 bg-muted/50 rounded-lg px-1 py-1">
            <button
              onClick={goBack}
              disabled={!canGoBack}
              className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-md hover:bg-background hover:shadow-sm transition-all text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed"
            >
              ← 前一小时
            </button>
            <span className="text-xs font-medium tabular-nums">
              {isLatestWindow ? (
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                  最近 1 小时
                </span>
              ) : (
                formatHourRange(windowStart)
              )}
            </span>
            <button
              onClick={goForward}
              disabled={!canGoForward}
              className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-md hover:bg-background hover:shadow-sm transition-all text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed"
            >
              后一小时 →
            </button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center h-40 gap-2 text-muted-foreground text-sm">
              <span className="inline-block w-3 h-3 rounded-full border-2 border-current border-t-transparent animate-spin" />
              加载中…
            </div>
          ) : data.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 gap-2 text-muted-foreground">
              <svg viewBox="0 0 24 24" className="w-8 h-8 opacity-30 fill-none stroke-current stroke-1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
              </svg>
              <span className="text-sm">该时段无弹幕数据</span>
            </div>
          ) : (
            <div className="relative">
              <p className="absolute -top-1 right-0 text-xs text-muted-foreground/60 pointer-events-none">
                点击查看弹幕
              </p>
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart
                  data={data}
                  margin={{ top: 4, right: 4, left: -20, bottom: 0 }}
                  onClick={handleChartClick}
                  style={{ cursor: 'pointer' }}
                >
                  <defs>
                    <linearGradient id="danmakuGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis
                    dataKey="minute"
                    tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                    tickLine={false}
                    axisLine={false}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      fontSize: 12,
                      background: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '0.5rem',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                    }}
                    labelFormatter={(label) => `时间: ${label}`}
                    formatter={(value: number) => [value, '弹幕数']}
                    cursor={{ stroke: 'hsl(var(--border))', strokeWidth: 1 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="count"
                    stroke="#6366f1"
                    strokeWidth={2}
                    fill="url(#danmakuGradient)"
                    dot={false}
                    activeDot={{ r: 5, fill: '#6366f1', strokeWidth: 2, stroke: '#fff', cursor: 'pointer' }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
