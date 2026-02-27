'use client';

import { useCallback, useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { apiClient } from '@/lib/api-client';
import type { DanmakuRecord, LlmAnalysisEvent, MonitorEvent } from '@bilibili-monitor/shared';

interface EventTimelineProps {
  roomId: number;
  liveEvents: MonitorEvent[];
}

const PAGE_SIZE = 50;

const eventLabels: Record<string, string> = {
  stream_start: '开播',
  stream_stop: '下播',
  title_change: '标题变更',
  area_change: '分区变更',
  danmaku_burst: '弹幕爆发',
};

const eventVariants: Record<string, 'success' | 'destructive' | 'default' | 'secondary' | 'outline'> = {
  stream_start: 'success',
  stream_stop: 'destructive',
  title_change: 'default',
  area_change: 'outline',
  danmaku_burst: 'secondary',
};

const eventDotColor: Record<string, string> = {
  stream_start: 'bg-green-500',
  stream_stop: 'bg-red-500',
  title_change: 'bg-primary',
  area_change: 'bg-muted-foreground',
  danmaku_burst: 'bg-purple-500',
};

const sentimentLabels: Record<string, string> = {
  positive: '正面',
  neutral: '中性',
  negative: '负面',
  excited: '亢奋',
};

const sentimentColors: Record<string, string> = {
  positive: 'text-green-600',
  neutral: 'text-muted-foreground',
  negative: 'text-red-500',
  excited: 'text-orange-500',
};

const sentimentBg: Record<string, string> = {
  positive: 'bg-green-50 border-green-200',
  neutral: 'bg-muted/40 border-border',
  negative: 'bg-red-50 border-red-200',
  excited: 'bg-orange-50 border-orange-200',
};

function toDateString(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatTime(date: Date | string | number): string {
  return new Date(date).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function danmakuWindowFor(event: MonitorEvent): { since: number; until: number } {
  const t = new Date(event.createdAt).getTime();
  switch (event.type) {
    case 'danmaku_burst': return { since: t - 30_000, until: t };
    default: return { since: t - 60_000, until: t + 60_000 };
  }
}

// ─── Danmaku popup ───────────────────────────────────────────────────────────

function DanmakuPanel({ roomId, event, onClose }: { roomId: number; event: MonitorEvent; onClose: () => void }) {
  const [danmaku, setDanmaku] = useState<DanmakuRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const since = event.type === 'llm_analysis' && event.windowSince != null
    ? event.windowSince
    : danmakuWindowFor(event).since;
  const until = event.type === 'llm_analysis' && event.windowUntil != null
    ? event.windowUntil
    : danmakuWindowFor(event).until;

  useEffect(() => {
    apiClient
      .getDanmaku(roomId, { since, until, limit: 200 })
      .then(({ danmaku: items }) => setDanmaku(items))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [roomId, since, until]);

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
            <p className="text-xs text-muted-foreground mt-0.5 tabular-nums">
              {formatTime(since)} – {formatTime(until)}
            </p>
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
            <p className="text-sm text-muted-foreground text-center py-6">该时段无弹幕记录</p>
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

// ─── Event detail ─────────────────────────────────────────────────────────────

function EventDetail({ event }: { event: MonitorEvent }) {
  switch (event.type) {
    case 'title_change':
    case 'area_change':
      return (
        <p className="text-xs text-muted-foreground mt-1 truncate">
          {event.from} → {event.to}
        </p>
      );
    case 'danmaku_burst':
      return (
        <p className="text-xs text-muted-foreground mt-1">
          30s 内 <span className="font-medium text-purple-600">{event.count}</span> 条（基线 {event.baseline}）
        </p>
      );
    default:
      return null;
  }
}

// ─── Date nav ─────────────────────────────────────────────────────────────────

function DateNav({ date, isToday, canGoForward, onPrev, onNext }: {
  date: string; isToday: boolean; canGoForward: boolean; onPrev: () => void; onNext: () => void;
}) {
  return (
    <div className="flex items-center justify-between bg-muted/50 rounded-lg px-1 py-1">
      <button onClick={onPrev} className="text-xs px-2.5 py-1.5 rounded-md hover:bg-background hover:shadow-sm transition-all text-muted-foreground hover:text-foreground">
        ← 前一天
      </button>
      <span className="text-xs font-medium tabular-nums">
        {isToday ? (
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            今天
          </span>
        ) : date}
      </span>
      <button onClick={onNext} disabled={!canGoForward} className="text-xs px-2.5 py-1.5 rounded-md hover:bg-background hover:shadow-sm transition-all text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed">
        后一天 →
      </button>
    </div>
  );
}

// ─── Events tab ───────────────────────────────────────────────────────────────

const STREAM_TYPES = ['stream_start', 'stream_stop', 'title_change', 'area_change', 'danmaku_burst'];

function EventsTab({ roomId, liveEvents }: { roomId: number; liveEvents: MonitorEvent[] }) {
  const today = toDateString(new Date());
  const [date, setDate] = useState(today);
  const [initialized, setInitialized] = useState(false);
  const [page, setPage] = useState(0);
  const [events, setEvents] = useState<MonitorEvent[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<MonitorEvent | null>(null);

  const isToday = date === today;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const load = useCallback((d: string, p: number) => {
    setLoading(true);
    apiClient
      .getEvents(roomId, { limit: PAGE_SIZE * 3, offset: p * PAGE_SIZE, date: d })
      .then(({ events: fetched, total: t }) => {
        const filtered = fetched.filter((e) => STREAM_TYPES.includes(e.type));
        setEvents(filtered.slice(0, PAGE_SIZE));
        setTotal(Math.round(t * (filtered.length / Math.max(fetched.length, 1))));
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [roomId]);

  useEffect(() => {
    apiClient.getEvents(roomId, { limit: 1 })
      .then(({ events: fetched }) => {
        if (fetched.length > 0) setDate(toDateString(new Date(fetched[0].createdAt)));
        setInitialized(true);
      })
      .catch(() => setInitialized(true));
  }, [roomId]);

  useEffect(() => { if (initialized) load(date, page); }, [date, page, load, initialized]);

  useEffect(() => {
    if (!isToday || page !== 0 || liveEvents.length === 0) return;
    const streamLive = liveEvents.filter((e) => STREAM_TYPES.includes(e.type));
    if (streamLive.length === 0) return;
    setEvents((prev) => {
      const ids = new Set(prev.map((e) => e.id));
      const newOnes = streamLive.filter((e) => !ids.has(e.id));
      if (newOnes.length === 0) return prev;
      setTotal((t) => t + newOnes.length);
      return [...newOnes, ...prev].slice(0, PAGE_SIZE);
    });
  }, [liveEvents, isToday, page]);

  function changeDate(delta: number) {
    const d = new Date(date); d.setDate(d.getDate() + delta);
    setDate(toDateString(d)); setPage(0);
  }

  return (
    <>
      {selectedEvent && <DanmakuPanel roomId={roomId} event={selectedEvent} onClose={() => setSelectedEvent(null)} />}
      <DateNav date={date} isToday={isToday} canGoForward={date < today} onPrev={() => changeDate(-1)} onNext={() => changeDate(1)} />
      <div className="flex-1 overflow-hidden flex flex-col min-h-0 mt-3">
        {loading ? (
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <span className="inline-block w-3 h-3 rounded-full border-2 border-current border-t-transparent animate-spin" />加载中…
          </div>
        ) : events.length === 0 ? (
          <div className="flex flex-col items-center justify-center flex-1 gap-2 text-muted-foreground">
            <svg viewBox="0 0 24 24" className="w-8 h-8 opacity-30 fill-none stroke-current stroke-1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
            </svg>
            <span className="text-sm">当日无事件</span>
          </div>
        ) : (
          <>
            <div className="relative flex-1 overflow-y-auto min-h-0 pr-1">
              <div className="absolute left-2 top-0 bottom-0 w-px bg-border" />
              <ul className="space-y-1.5 ml-6">
                {events.map((event) => (
                  <li key={event.id} className="relative">
                    <div className={`absolute -left-6 top-2.5 h-2 w-2 rounded-full border-2 border-background ${eventDotColor[event.type] ?? 'bg-primary'}`} />
                    <div className="flex items-start justify-between gap-2 cursor-pointer rounded-lg hover:bg-muted/60 -mx-1 px-2 py-1.5 transition-colors group" onClick={() => setSelectedEvent(event)}>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <Badge variant={eventVariants[event.type]}>{eventLabels[event.type] ?? event.type}</Badge>
                          <svg viewBox="0 0 24 24" className="w-3 h-3 fill-none stroke-current stroke-2 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                            <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                          </svg>
                        </div>
                        <EventDetail event={event} />
                      </div>
                      <time className="text-xs text-muted-foreground whitespace-nowrap tabular-nums mt-0.5">{formatTime(event.createdAt)}</time>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
            {totalPages > 1 ? (
              <div className="flex items-center justify-between pt-3 mt-2 border-t shrink-0">
                <button onClick={() => setPage((p) => p - 1)} disabled={page === 0} className="text-xs px-3 py-1.5 rounded-lg bg-muted hover:bg-muted/80 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">← 较新</button>
                <span className="text-xs text-muted-foreground tabular-nums">{page + 1} / {totalPages}</span>
                <button onClick={() => setPage((p) => p + 1)} disabled={page >= totalPages - 1} className="text-xs px-3 py-1.5 rounded-lg bg-muted hover:bg-muted/80 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">较早 →</button>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground mt-2 text-right tabular-nums shrink-0">共 {total} 条</p>
            )}
          </>
        )}
      </div>
    </>
  );
}

// ─── Analysis tab ─────────────────────────────────────────────────────────────

function AnalysisTab({ roomId, liveEvents }: { roomId: number; liveEvents: MonitorEvent[] }) {
  const today = toDateString(new Date());
  const [date, setDate] = useState(today);
  const [initialized, setInitialized] = useState(false);
  const [page, setPage] = useState(0);
  const [events, setEvents] = useState<LlmAnalysisEvent[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<MonitorEvent | null>(null);

  const isToday = date === today;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const load = useCallback((d: string, p: number) => {
    setLoading(true);
    apiClient
      .getEvents(roomId, { limit: PAGE_SIZE, offset: p * PAGE_SIZE, date: d, type: 'llm_analysis' })
      .then(({ events: fetched, total: t }) => {
        setEvents(fetched as LlmAnalysisEvent[]);
        setTotal(t);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [roomId]);

  useEffect(() => {
    apiClient.getEvents(roomId, { limit: 1, type: 'llm_analysis' })
      .then(({ events: fetched }) => {
        if (fetched.length > 0) setDate(toDateString(new Date(fetched[0].createdAt)));
        setInitialized(true);
      })
      .catch(() => setInitialized(true));
  }, [roomId]);

  useEffect(() => { if (initialized) load(date, page); }, [date, page, load, initialized]);

  useEffect(() => {
    if (!isToday || page !== 0 || liveEvents.length === 0) return;
    const analysisLive = liveEvents.filter((e) => e.type === 'llm_analysis') as LlmAnalysisEvent[];
    if (analysisLive.length === 0) return;
    setEvents((prev) => {
      const ids = new Set(prev.map((e) => e.id));
      const newOnes = analysisLive.filter((e) => !ids.has(e.id));
      if (newOnes.length === 0) return prev;
      setTotal((t) => t + newOnes.length);
      return [...newOnes, ...prev].slice(0, PAGE_SIZE);
    });
  }, [liveEvents, isToday, page]);

  function changeDate(delta: number) {
    const d = new Date(date); d.setDate(d.getDate() + delta);
    setDate(toDateString(d)); setPage(0);
  }

  return (
    <>
      {selectedEvent && <DanmakuPanel roomId={roomId} event={selectedEvent} onClose={() => setSelectedEvent(null)} />}
      <DateNav date={date} isToday={isToday} canGoForward={date < today} onPrev={() => changeDate(-1)} onNext={() => changeDate(1)} />
      <div className="flex-1 overflow-hidden flex flex-col min-h-0 mt-3">
        {loading ? (
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <span className="inline-block w-3 h-3 rounded-full border-2 border-current border-t-transparent animate-spin" />加载中…
          </div>
        ) : events.length === 0 ? (
          <div className="flex flex-col items-center justify-center flex-1 gap-2 text-muted-foreground">
            <svg viewBox="0 0 24 24" className="w-8 h-8 opacity-30 fill-none stroke-current stroke-1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" />
            </svg>
            <span className="text-sm">当日无分析记录</span>
          </div>
        ) : (
          <>
            <ul className="flex-1 overflow-y-auto min-h-0 space-y-2 pr-1">
              {events.map((event) => (
                <li
                  key={event.id}
                  onClick={() => setSelectedEvent(event)}
                  className={`rounded-xl border p-3 space-y-2 cursor-pointer transition-opacity hover:opacity-80 ${sentimentBg[event.sentiment] ?? 'bg-muted/40 border-border'}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={`text-xs font-semibold ${sentimentColors[event.sentiment] ?? 'text-muted-foreground'}`}>
                        {sentimentLabels[event.sentiment] ?? event.sentiment}
                      </span>
                      {(event as { trigger?: string }).trigger === 'manual' && (
                        <span className="text-xs bg-background border border-border text-muted-foreground px-1.5 py-0.5 rounded-full">手动</span>
                      )}
                      {event.significantChange && (
                        <span className="text-xs text-orange-600 font-medium">⚡ 有变化</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <time className="text-xs text-muted-foreground tabular-nums">{formatTime(event.createdAt)}</time>
                      <svg viewBox="0 0 24 24" className="w-3 h-3 fill-none stroke-current stroke-2 text-muted-foreground opacity-50">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                      </svg>
                    </div>
                  </div>
                  {event.windowSince != null && event.windowUntil != null && (
                    <p className="text-xs text-muted-foreground/70 tabular-nums">
                      分析窗口：{formatTime(event.windowSince)} – {formatTime(event.windowUntil)}
                    </p>
                  )}
                  <p className="text-xs leading-relaxed text-foreground/85">{event.summary}</p>
                  {event.changeDescription && (
                    <p className="text-xs text-muted-foreground italic">{event.changeDescription}</p>
                  )}
                  {event.topKeywords.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {event.topKeywords.map((kw) => (
                        <span key={kw} className="text-xs bg-background/80 border border-border/60 text-foreground/70 px-1.5 py-0.5 rounded-full">{kw}</span>
                      ))}
                    </div>
                  )}
                </li>
              ))}
            </ul>
            {totalPages > 1 ? (
              <div className="flex items-center justify-between pt-3 mt-2 border-t shrink-0">
                <button onClick={() => setPage((p) => p - 1)} disabled={page === 0} className="text-xs px-3 py-1.5 rounded-lg bg-muted hover:bg-muted/80 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">← 较新</button>
                <span className="text-xs text-muted-foreground tabular-nums">{page + 1} / {totalPages}</span>
                <button onClick={() => setPage((p) => p + 1)} disabled={page >= totalPages - 1} className="text-xs px-3 py-1.5 rounded-lg bg-muted hover:bg-muted/80 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">较早 →</button>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground mt-2 text-right tabular-nums shrink-0">共 {total} 条</p>
            )}
          </>
        )}
      </div>
    </>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function EventTimeline({ roomId, liveEvents }: EventTimelineProps) {
  const [tab, setTab] = useState<'events' | 'analysis'>('events');

  return (
    <Card className="flex flex-col h-[600px]">
      <CardHeader className="pb-3 shrink-0">
        <div className="flex items-center justify-between">
          <CardTitle>时间线</CardTitle>
          <div className="flex items-center bg-muted/60 rounded-lg p-0.5 text-xs">
            <button
              onClick={() => setTab('events')}
              className={`px-3 py-1.5 rounded-md transition-all ${tab === 'events' ? 'bg-background shadow-sm text-foreground font-medium' : 'text-muted-foreground hover:text-foreground'}`}
            >
              直播事件
            </button>
            <button
              onClick={() => setTab('analysis')}
              className={`px-3 py-1.5 rounded-md transition-all ${tab === 'analysis' ? 'bg-background shadow-sm text-foreground font-medium' : 'text-muted-foreground hover:text-foreground'}`}
            >
              AI 分析
            </button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden flex flex-col min-h-0">
        {tab === 'events' ? <EventsTab roomId={roomId} liveEvents={liveEvents} /> : <AnalysisTab roomId={roomId} liveEvents={liveEvents} />}
      </CardContent>
    </Card>
  );
}
