// MonitorEvent union types

export type EventType =
  | 'stream_start'
  | 'stream_stop'
  | 'area_change'
  | 'title_change'
  | 'danmaku_burst'
  | 'llm_analysis';

export interface BaseEvent {
  id: string;
  roomId: number;
  type: EventType;
  createdAt: Date;
}

export interface StreamStartEvent extends BaseEvent {
  type: 'stream_start';
}

export interface StreamStopEvent extends BaseEvent {
  type: 'stream_stop';
}

export interface AreaChangeEvent extends BaseEvent {
  type: 'area_change';
  from: string;
  to: string;
}

export interface TitleChangeEvent extends BaseEvent {
  type: 'title_change';
  from: string;
  to: string;
}

export interface DanmakuBurstEvent extends BaseEvent {
  type: 'danmaku_burst';
  count: number;
  baseline: number;
}

export interface LlmAnalysisEvent extends BaseEvent {
  type: 'llm_analysis';
  summary: string;
  sentiment: 'positive' | 'neutral' | 'negative' | 'excited';
  significantChange: boolean;
  changeDescription?: string;
  topKeywords: string[];
  /** How this analysis was triggered */
  trigger: 'auto' | 'manual';
  /** Unix ms — start of the danmaku window analyzed */
  windowSince: number;
  /** Unix ms — end of the danmaku window analyzed */
  windowUntil: number;
}

export type MonitorEvent =
  | StreamStartEvent
  | StreamStopEvent
  | AreaChangeEvent
  | TitleChangeEvent
  | DanmakuBurstEvent
  | LlmAnalysisEvent;

export interface WebhookPayload {
  event: MonitorEvent;
  stream: {
    roomId: number;
    title: string;
    liveStatus: 0 | 1 | 2;
    areaName: string;
    parentAreaName: string;
    online: number;
    coverUrl: string;
  };
  timestamp: string;
}
