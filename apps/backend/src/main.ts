import express from 'express';
import cors from 'cors';
import { config } from './config/index.js';
import { getDb } from './db/schema.js';
import { eventBus } from './core/event-bus.js';
import { roomManager } from './core/room-manager.js';
import { sendWebhook } from './notification/webhook.js';
import { apiRouter } from './api/router.js';
import { sseRouter } from './api/routes/sse.js';
import { errorHandler, notFound } from './api/middleware/errorHandler.js';

async function main() {
  // Initialize database
  getDb();
  console.log('[Main] Database initialized');

  // Wire: monitor events -> webhook
  eventBus.onMonitorEvent((event) => {
    sendWebhook(event).catch(console.error);
  });

  // Setup Express
  const app = express();

  app.use(cors({ origin: config.CORS_ORIGIN }));
  app.use(express.json());

  // Health check
  app.get('/health', (_req, res) => {
    const active = roomManager.getActive();
    res.json({
      status: 'ok',
      roomId: active?.roomId ?? null,
      wsConnected: active?.wsClient.isConnected ?? false,
      timestamp: new Date().toISOString(),
    });
  });

  // SSE endpoint at root level (per-room)
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

  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log('[Main] Shutting down...');
    roomManager.stopAll();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    console.log('[Main] Shutting down...');
    roomManager.stopAll();
    process.exit(0);
  });
}

main().catch((err) => {
  console.error('[Main] Fatal error:', err);
  process.exit(1);
});
