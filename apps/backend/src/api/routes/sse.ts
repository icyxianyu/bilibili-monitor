import { Router } from 'express';
import type { Request, Response } from 'express';
import { eventBus } from '../../core/event-bus.js';
import type { MonitorEvent } from '@bilibili-monitor/shared';

export const sseRouter = Router();

sseRouter.get('/', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering

  res.write('data: {"type":"connected"}\n\n');

  const onEvent = (event: MonitorEvent) => {
    res.write(`data: ${JSON.stringify(event)}\n\n`);
  };

  const onDanmaku = (data: { uid: number; username: string; content: string; timestamp: number }) => {
    res.write(`data: ${JSON.stringify({ type: 'danmaku', ...data })}\n\n`);
  };

  eventBus.onMonitorEvent(onEvent);
  eventBus.onDanmaku(onDanmaku);

  // Keep-alive ping every 25s
  const pingTimer = setInterval(() => {
    res.write(': ping\n\n');
  }, 25_000);

  req.on('close', () => {
    clearInterval(pingTimer);
    eventBus.removeListener('monitor:event', onEvent);
    eventBus.removeListener('danmaku', onDanmaku);
  });
});
