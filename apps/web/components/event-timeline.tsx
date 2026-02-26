'use client';

import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import type { MonitorEvent } from '@bilibili-monitor/shared';

interface EventTimelineProps {
  events: MonitorEvent[];
}

const eventLabels: Record<string, string> = {
  stream_start: '开播',
  stream_stop: '下播',
  title_change: '标题变更',
  area_change: '分区变更',
  danmaku_burst: '弹幕爆发',
  llm_analysis: 'AI 分析',
};

const eventVariants: Record<string, 'success' | 'destructive' | 'default' | 'secondary' | 'outline'> = {
  stream_start: 'success',
  stream_stop: 'destructive',
  title_change: 'default',
  area_change: 'outline',
  danmaku_burst: 'secondary',
  llm_analysis: 'outline',
};

function formatTime(date: Date | string): string {
  return new Date(date).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function EventDetail({ event }: { event: MonitorEvent }) {
  switch (event.type) {
    case 'title_change':
      return (
        <p className="text-xs text-muted-foreground mt-1">
          {event.from} → {event.to}
        </p>
      );
    case 'area_change':
      return (
        <p className="text-xs text-muted-foreground mt-1">
          {event.from} → {event.to}
        </p>
      );
    case 'danmaku_burst':
      return (
        <p className="text-xs text-muted-foreground mt-1">
          30s 内 {event.count} 条弹幕（基线：{event.baseline}）
        </p>
      );
    case 'llm_analysis':
      return (
        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{event.summary}</p>
      );
    default:
      return null;
  }
}

export function EventTimeline({ events }: EventTimelineProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>事件时间线</CardTitle>
      </CardHeader>
      <CardContent>
        {events.length === 0 ? (
          <p className="text-muted-foreground text-sm">暂无事件</p>
        ) : (
          <div className="relative">
            <div className="absolute left-2 top-0 bottom-0 w-0.5 bg-border" />
            <ul className="space-y-3 ml-6">
              {events.map((event) => (
                <li key={event.id} className="relative">
                  <div className="absolute -left-6 top-1 h-2.5 w-2.5 rounded-full bg-primary border-2 border-background" />
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Badge variant={eventVariants[event.type]}>
                          {eventLabels[event.type] ?? event.type}
                        </Badge>
                      </div>
                      <EventDetail event={event} />
                    </div>
                    <time className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatTime(event.createdAt)}
                    </time>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
