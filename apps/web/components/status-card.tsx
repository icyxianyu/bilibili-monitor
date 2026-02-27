'use client';

import { Badge } from './ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import type { RoomInfo } from '@bilibili-monitor/shared';

interface StatusCardProps {
  info: RoomInfo | null;
  wsConnected: boolean;
}

const liveStatusLabel: Record<number, string> = {
  0: '未开播',
  1: '直播中',
  2: '轮播中',
};

const liveStatusVariant: Record<number, 'success' | 'secondary' | 'outline'> = {
  0: 'secondary',
  1: 'success',
  2: 'outline',
};

export function StatusCard({ info, wsConnected }: StatusCardProps) {
  if (!info) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>直播间状态</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <span className="inline-block w-3 h-3 rounded-full border-2 border-current border-t-transparent animate-spin" />
            加载中...
          </div>
        </CardContent>
      </Card>
    );
  }

  const isLive = info.liveStatus === 1;

  return (
    <Card className="overflow-hidden">
      {/* Cover image as background strip */}
      {info.coverUrl && (
        <div className="relative h-32 overflow-hidden">
          <img
            src={info.coverUrl}
            alt="封面"
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-card via-card/60 to-transparent" />
          {isLive && (
            <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-red-500 text-white text-xs font-semibold px-2 py-0.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              LIVE
            </div>
          )}
        </div>
      )}

      <CardHeader className={info.coverUrl ? 'pt-3' : ''}>
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-sm font-semibold leading-snug line-clamp-2 flex-1">
            {info.title}
          </CardTitle>
          <div className="flex flex-col items-end gap-1.5 shrink-0">
            {!info.coverUrl && (
              <Badge variant={liveStatusVariant[info.liveStatus]}>
                {liveStatusLabel[info.liveStatus] ?? '未知'}
              </Badge>
            )}
            <Badge variant={wsConnected ? 'success' : 'destructive'}>
              WS {wsConnected ? '已连接' : '断开'}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-lg bg-muted/60 px-3 py-2">
            <p className="text-xs text-muted-foreground mb-0.5">分区</p>
            <p className="text-xs font-medium truncate">
              {info.parentAreaName} / {info.areaName}
            </p>
          </div>
          <div className="rounded-lg bg-muted/60 px-3 py-2">
            <p className="text-xs text-muted-foreground mb-0.5">在线人数</p>
            <p className="text-sm font-semibold tabular-nums">{info.online.toLocaleString()}</p>
          </div>
          <div className="rounded-lg bg-muted/60 px-3 py-2">
            <p className="text-xs text-muted-foreground mb-0.5">房间号</p>
            <p className="text-sm font-semibold tabular-nums">{info.roomId}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
