import { getRoomInfo } from './api.js';
import { eventBus } from '../core/event-bus.js';
import { upsertStreamStatus } from '../db/repositories/streamStatus.js';
import { insertEvent } from '../db/repositories/events.js';
import { randomUUID } from 'crypto';
import type { RoomInfo } from '@bilibili-monitor/shared';

const POLL_INTERVAL_MS = 30_000;

export class HttpPoller {
  private timer: ReturnType<typeof setInterval> | null = null;
  private lastInfo: RoomInfo | null = null;
  private stopped = false;

  constructor(private readonly roomId: number) {}

  async start(initialInfo?: RoomInfo): Promise<void> {
    this.stopped = false;
    if (initialInfo) {
      // Use already-fetched info to populate DB immediately without an extra API call
      upsertStreamStatus(initialInfo);
      eventBus.emitStreamStatus({ roomId: this.roomId, liveStatus: initialInfo.liveStatus, title: initialInfo.title });
      this.lastInfo = initialInfo;
      this.timer = setInterval(() => {
        if (!this.stopped) this.poll();
      }, POLL_INTERVAL_MS);
    } else {
      await this.poll(); // immediate first poll
      this.timer = setInterval(() => {
        if (!this.stopped) this.poll();
      }, POLL_INTERVAL_MS);
    }
  }

  stop(): void {
    this.stopped = true;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private async poll(): Promise<void> {
    try {
      const info = await getRoomInfo(this.roomId);
      upsertStreamStatus(info);
      eventBus.emitStreamStatus({ roomId: this.roomId, liveStatus: info.liveStatus, title: info.title });

      if (this.lastInfo) {
        this.detectChanges(this.lastInfo, info);
      }

      this.lastInfo = info;
    } catch (err) {
      console.error('[HttpPoller] Poll error:', err);
    }
  }

  private detectChanges(prev: RoomInfo, curr: RoomInfo): void {
    const roomId = curr.roomId;
    const now = new Date();

    // Stream started
    if (prev.liveStatus !== 1 && curr.liveStatus === 1) {
      const event = { id: randomUUID(), roomId, type: 'stream_start' as const, createdAt: now };
      insertEvent(event);
      eventBus.emitMonitorEvent(event);
      console.log(`[HttpPoller] Stream started for room ${roomId}`);
    }

    // Stream stopped
    if (prev.liveStatus === 1 && curr.liveStatus !== 1) {
      const event = { id: randomUUID(), roomId, type: 'stream_stop' as const, createdAt: now };
      insertEvent(event);
      eventBus.emitMonitorEvent(event);
      console.log(`[HttpPoller] Stream stopped for room ${roomId}`);
    }

    // Title changed
    if (prev.title !== curr.title) {
      const event = {
        id: randomUUID(),
        roomId,
        type: 'title_change' as const,
        createdAt: now,
        from: prev.title,
        to: curr.title,
      };
      insertEvent(event);
      eventBus.emitMonitorEvent(event);
      console.log(`[HttpPoller] Title changed: "${prev.title}" -> "${curr.title}"`);
    }

    // Area changed
    if (prev.areaName !== curr.areaName) {
      const event = {
        id: randomUUID(),
        roomId,
        type: 'area_change' as const,
        createdAt: now,
        from: prev.areaName,
        to: curr.areaName,
      };
      insertEvent(event);
      eventBus.emitMonitorEvent(event);
      console.log(`[HttpPoller] Area changed: "${prev.areaName}" -> "${curr.areaName}"`);
    }
  }

  getCurrentInfo(): RoomInfo | null {
    return this.lastInfo;
  }
}
