import { BilibiliWsClient } from '../bilibili/ws-client.js';
import { HttpPoller } from '../bilibili/http-poller.js';
import { DanmakuTrigger } from '../analysis/trigger.js';
import { eventBus } from './event-bus.js';
import { insertDanmaku } from '../db/repositories/danmaku.js';
import { getRoomInfo } from '../bilibili/api.js';
import type { WsMessage } from '@bilibili-monitor/shared';

interface RoomContext {
  inputRoomId: number;  // what the user typed (may be short id)
  roomId: number;       // real room id from Bilibili API
  wsClient: BilibiliWsClient;
  httpPoller: HttpPoller;
  danmakuTrigger: DanmakuTrigger;
}

class RoomManager {
  private active: RoomContext | null = null;
  private switchingPromise: Promise<void> | null = null;

  async ensureRoom(inputRoomId: number): Promise<number> {
    // If a switch is in progress, wait for it to finish first
    if (this.switchingPromise) {
      await this.switchingPromise;
    }
    // After waiting, check if the room is already active (compare by both input and real id)
    if (this.active?.roomId === inputRoomId || this.active?.inputRoomId === inputRoomId) {
      return this.active.roomId;
    }
    // Start a new switch and store the promise so concurrent callers can await it
    this.switchingPromise = this.switchRoom(inputRoomId);
    try {
      await this.switchingPromise;
    } finally {
      this.switchingPromise = null;
    }
    return this.active!.roomId;
  }

  private async switchRoom(inputRoomId: number): Promise<void> {
      if (this.active) {
        this.active.wsClient.stop();
        this.active.httpPoller.stop();
        this.active.danmakuTrigger.stop();
        console.log(`[RoomManager] Stopped room ${this.active.roomId}`);
      }

      // Resolve short id -> real room id first
      const roomInfo = await getRoomInfo(inputRoomId);
      const roomId = roomInfo.roomId;
      if (roomId !== inputRoomId) {
        console.log(`[RoomManager] Resolved short id ${inputRoomId} -> real id ${roomId}`);
      }

      const wsClient = new BilibiliWsClient(roomId);
      const httpPoller = new HttpPoller(roomId);
      const danmakuTrigger = new DanmakuTrigger(roomId);

      wsClient.on('message', (msg: WsMessage) => {
        if (msg.cmd === 'DANMU_MSG' && Array.isArray(msg.info)) {
          const info = msg.info;
          const content = info[1] as string;
          const uid = (info[2] as unknown[])?.[0] as number;
          const username = (info[2] as unknown[])?.[1] as string;
          const timestamp = Date.now();

          if (content) {
            insertDanmaku({ roomId, uid: uid ?? 0, username: username ?? 'unknown', content, timestamp });
            eventBus.emitDanmaku({ roomId, uid: uid ?? 0, username: username ?? 'unknown', content, timestamp });
            danmakuTrigger.addDanmaku(content);
          }
        }
      });

      wsClient.on('connected', () => {
        console.log(`[RoomManager] WebSocket connected for room ${roomId}`);
      });

      wsClient.on('disconnected', () => {
        console.log(`[RoomManager] WebSocket disconnected for room ${roomId}`);
      });

      this.active = { inputRoomId, roomId, wsClient, httpPoller, danmakuTrigger };

      danmakuTrigger.start();
      await httpPoller.start(roomInfo);  // pass already-fetched info, no extra API call
      await wsClient.connect();
      console.log(`[RoomManager] Started room ${roomId} (input: ${inputRoomId})`);
  }

  getActive(): RoomContext | null {
    return this.active;
  }

  stopAll(): void {
    if (this.active) {
      this.active.wsClient.stop();
      this.active.httpPoller.stop();
      this.active.danmakuTrigger.stop();
      console.log(`[RoomManager] Stopped all rooms`);
    }
  }
}

export const roomManager = new RoomManager();
