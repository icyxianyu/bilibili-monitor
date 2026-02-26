// Bilibili API and WebSocket protocol types

export interface RoomInfo {
  roomId: number;
  shortId: number;
  uid: number;
  title: string;
  liveStatus: 0 | 1 | 2; // 0=not live, 1=live, 2=loop
  liveStartTime: number;
  areaId: number;
  areaName: string;
  parentAreaId: number;
  parentAreaName: string;
  online: number;
  coverUrl: string;
  description: string;
  tags: string;
}

export interface DanmuInfo {
  token: string;
  hostList: Array<{
    host: string;
    port: number;
    wssPort: number;
    wsPort: number;
  }>;
}

// WS Packet header
export interface PacketHeader {
  totalLength: number;
  headerLength: number;
  version: 1 | 2 | 3;
  operation: WsOperation;
  sequence: number;
}

export enum WsOperation {
  Heartbeat = 2,
  HeartbeatReply = 3,
  Notification = 5,
  Auth = 7,
  AuthReply = 8,
}

export enum WsVersion {
  Json = 1,
  Deflate = 2,
  Brotli = 3,
}

export interface WsAuthBody {
  uid: number;
  roomid: number;
  protover: 3;
  platform: 'web';
  type: 2;
  key: string;
  buvid?: string;
}

// Raw WS message commands
export type WsCmd =
  | 'DANMU_MSG'
  | 'LIVE'
  | 'PREPARING'
  | 'ROOM_CHANGE'
  | 'SEND_GIFT'
  | 'COMBO_SEND'
  | 'INTERACT_WORD'
  | 'USER_TOAST_MSG'
  | string;

export interface WsMessage {
  cmd: WsCmd;
  data?: Record<string, unknown>;
  info?: unknown[];
}

export interface DanmakuRecord {
  id: number;
  roomId: number;
  uid: number;
  username: string;
  content: string;
  timestamp: number;
  createdAt: string;
}
