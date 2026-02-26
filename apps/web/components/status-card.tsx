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
          <p className="text-muted-foreground">加载中...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{info.title}</CardTitle>
          <div className="flex gap-2">
            <Badge variant={liveStatusVariant[info.liveStatus]}>
              {liveStatusLabel[info.liveStatus] ?? '未知'}
            </Badge>
            <Badge variant={wsConnected ? 'success' : 'destructive'}>
              WS {wsConnected ? '已连接' : '断开'}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">分区</p>
            <p className="font-medium">
              {info.parentAreaName} / {info.areaName}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">在线人数</p>
            <p className="font-medium">{info.online.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-muted-foreground">房间号</p>
            <p className="font-medium">{info.roomId}</p>
          </div>
        </div>
        {info.coverUrl && (
          <img
            src={info.coverUrl}
            alt="封面"
            className="mt-4 rounded-md w-full max-h-40 object-cover"
          />
        )}
      </CardContent>
    </Card>
  );
}
