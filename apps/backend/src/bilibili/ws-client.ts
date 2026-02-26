import WebSocket from 'ws';
import { EventEmitter } from 'events';
import { WsOperation, type WsMessage, type WsAuthBody } from '@bilibili-monitor/shared';
import { encodePacket, decodePackets, parseHeartbeatReply } from './packet.js';
import { getDanmuInfo } from './api.js';
import { config } from '../config/index.js';

const HEARTBEAT_INTERVAL_MS = 30_000;
const RECONNECT_DELAY_MS = 5_000;
const MAX_RECONNECT_ATTEMPTS = 20;

interface WsClientEvents {
  message: [msg: WsMessage];
  online: [count: number];
  connected: [];
  disconnected: [];
  error: [err: Error];
}

function extractFromCookie(cookie: string, key: string): string {
  return cookie.match(new RegExp(`${key}=([^;\\s]+)`))?.[1] ?? '';
}

export class BilibiliWsClient extends EventEmitter {
  private ws: WebSocket | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private reconnectAttempts = 0;
  private stopped = false;
  private readonly uid: number;
  private readonly buvid: string;

  constructor(private readonly roomId: number) {
    super();
    this.setMaxListeners(20);
    const cookie = config.BILIBILI_COOKIE || '';
    this.uid = Number(extractFromCookie(cookie, 'DedeUserID')) || 0;
    this.buvid = extractFromCookie(cookie, 'buvid3');
  }

  async connect(): Promise<void> {
    this.stopped = false;
    await this.doConnect();
  }

  stop(): void {
    this.stopped = true;
    this.cleanup();
  }

  private async doConnect(): Promise<void> {
    try {
      const danmuInfo = await getDanmuInfo(this.roomId);
      const host = danmuInfo.hostList[0];
      const wsUrl = `wss://${host.host}:${host.wssPort}/sub`;

      console.log(`[WsClient] Connecting to ${wsUrl}`);

      const ws = new WebSocket(wsUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Origin: 'https://live.bilibili.com',
          Cookie: config.BILIBILI_COOKIE || '',
        },
      });
      this.ws = ws;

      ws.on('open', () => {
        const authBody: WsAuthBody = {
          uid: this.uid,
          roomid: this.roomId,
          protover: 3,
          platform: 'web',
          type: 2,
          key: danmuInfo.token,
          buvid: this.buvid,
        };
        ws.send(encodePacket(WsOperation.Auth, authBody));
      });

      ws.on('message', (data: Buffer) => {
        this.handleData(data);
      });

      ws.on('close', () => {
        console.log('[WsClient] Connection closed');
        this.cleanup();
        this.emit('disconnected');
        if (!this.stopped) {
          this.scheduleReconnect();
        }
      });

      ws.on('error', (err) => {
        console.error('[WsClient] WebSocket error:', err.message);
        this.emit('error', err);
      });
    } catch (err) {
      console.error('[WsClient] Connect error:', err);
      if (!this.stopped) {
        this.scheduleReconnect();
      }
    }
  }

  private handleData(data: Buffer): void {
    const packets = decodePackets(data);

    for (const packet of packets) {
      if (packet.header.operation === WsOperation.AuthReply) {
        console.log('[WsClient] Auth success, starting heartbeat');
        this.startHeartbeat();
        this.reconnectAttempts = 0;
        this.emit('connected');
      } else if (packet.header.operation === WsOperation.HeartbeatReply) {
        const online = parseHeartbeatReply(packet.body);
        this.emit('online', online);
      } else if (packet.header.operation === WsOperation.Notification) {
        try {
          const msg = JSON.parse(packet.body.toString('utf-8')) as WsMessage;
          this.emit('message', msg);
        } catch {
          // ignore parse errors
        }
      }
    }
  }

  private startHeartbeat(): void {
    this.clearHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(encodePacket(WsOperation.Heartbeat, {}));
      }
    }, HEARTBEAT_INTERVAL_MS);
  }

  private clearHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private cleanup(): void {
    this.clearHeartbeat();
    if (this.ws) {
      this.ws.removeAllListeners();
      if (
        this.ws.readyState === WebSocket.OPEN ||
        this.ws.readyState === WebSocket.CONNECTING
      ) {
        this.ws.terminate();
      }
      this.ws = null;
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      console.error('[WsClient] Max reconnect attempts reached');
      return;
    }
    this.reconnectAttempts++;
    const delay = RECONNECT_DELAY_MS * Math.min(this.reconnectAttempts, 6);
    console.log(`[WsClient] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);
    setTimeout(() => {
      if (!this.stopped) this.doConnect();
    }, delay);
  }

  get isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}
