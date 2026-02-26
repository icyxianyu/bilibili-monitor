import { EventEmitter } from 'events';
import type { MonitorEvent } from '@bilibili-monitor/shared';

type EventBusEvents = {
  'monitor:event': [event: MonitorEvent];
  'danmaku': [data: { uid: number; username: string; content: string; timestamp: number }];
  'stream:status': [data: { liveStatus: number; title: string }];
};

class EventBus extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(50);
  }

  emitMonitorEvent(event: MonitorEvent) {
    this.emit('monitor:event', event);
  }

  emitDanmaku(data: EventBusEvents['danmaku'][0]) {
    this.emit('danmaku', data);
  }

  emitStreamStatus(data: EventBusEvents['stream:status'][0]) {
    this.emit('stream:status', data);
  }

  onMonitorEvent(listener: (event: MonitorEvent) => void) {
    this.on('monitor:event', listener);
    return this;
  }

  onDanmaku(listener: (data: EventBusEvents['danmaku'][0]) => void) {
    this.on('danmaku', listener);
    return this;
  }

  onStreamStatus(listener: (data: EventBusEvents['stream:status'][0]) => void) {
    this.on('stream:status', listener);
    return this;
  }
}

export const eventBus = new EventBus();
