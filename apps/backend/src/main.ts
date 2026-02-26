import express from 'express';
import cors from 'cors';
import { config } from './config/index.js';
import { getDb } from './db/schema.js';
import { eventBus } from './core/event-bus.js';
import { BilibiliWsClient } from './bilibili/ws-client.js';
import { HttpPoller } from './bilibili/http-poller.js';
import { DanmakuTrigger } from './analysis/trigger.js';
import { sendWebhook } from './notification/webhook.js';
import { insertDanmaku } from './db/repositories/danmaku.js';
import { apiRouter } from './api/router.js';
import { sseRouter } from './api/routes/sse.js';
import { errorHandler, notFound } from './api/middleware/errorHandler.js';
import type { WsMessage } from '@bilibili-monitor/shared';

async function main() {
  // Initialize database
  getDb();
  console.log('[Main] Database initialized');

  // Create services
  const wsClient = new BilibiliWsClient(config.BILIBILI_ROOM_ID);
  const httpPoller = new HttpPoller();
  const danmakuTrigger = new DanmakuTrigger(config.BILIBILI_ROOM_ID);

  // Wire: WS messages -> danmaku processing
  wsClient.on('message', (msg: WsMessage) => {
    if (msg.cmd === 'DANMU_MSG' && Array.isArray(msg.info)) {
      const info = msg.info;
      const content = info[1] as string;
      const uid = (info[2] as unknown[])?.[0] as number;
      const username = (info[2] as unknown[])?.[1] as string;
      const timestamp = Date.now();

      if (content) {
        insertDanmaku({ roomId: config.BILIBILI_ROOM_ID, uid: uid ?? 0, username: username ?? 'unknown', content, timestamp });
        eventBus.emitDanmaku({ uid: uid ?? 0, username: username ?? 'unknown', content, timestamp });
        danmakuTrigger.addDanmaku(content);
      }
    }
  });

  wsClient.on('connected', () => {
    console.log('[Main] WebSocket connected');
  });

  wsClient.on('disconnected', () => {
    console.log('[Main] WebSocket disconnected');
  });

  // Wire: monitor events -> webhook
  eventBus.onMonitorEvent((event) => {
    sendWebhook(event).catch(console.error);
  });

  // Setup Express
  const app = express();

  app.use(cors({ origin: config.CORS_ORIGIN }));
  app.use(express.json());

  // Health check
  app.get('/health', (req, res) => {
    res.json({
      status: 'ok',
      wsConnected: wsClient.isConnected,
      roomId: config.BILIBILI_ROOM_ID,
      timestamp: new Date().toISOString(),
    });
  });

  // SSE endpoint at root level
  app.use('/sse', sseRouter);

  // API routes
  app.use('/api', apiRouter);

  // 404 and error handlers
  app.use(notFound);
  app.use(errorHandler);

  // Start the server
  app.listen(config.HTTP_PORT, () => {
    console.log(`[Main] Server listening on port ${config.HTTP_PORT}`);
  });

  // Start services
  danmakuTrigger.start();
  await httpPoller.start();
  await wsClient.connect();

  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log('[Main] Shutting down...');
    wsClient.stop();
    httpPoller.stop();
    danmakuTrigger.stop();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    console.log('[Main] Shutting down...');
    wsClient.stop();
    httpPoller.stop();
    danmakuTrigger.stop();
    process.exit(0);
  });
}

main().catch((err) => {
  console.error('[Main] Fatal error:', err);
  process.exit(1);
});
