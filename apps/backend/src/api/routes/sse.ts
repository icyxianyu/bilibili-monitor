import { Router } from 'express';
import type { Request, Response } from 'express';
import { eventBus } from '../../core/event-bus.js';
import { roomManager } from '../../core/room-manager.js';
import type { MonitorEvent } from '@bilibili-monitor/shared';

export const sseRouter = Router();

sseRouter.get('/:roomId', async (req: Request, res: Response) => {
  const inputRoomId = Number(req.params['roomId']);
  if (!Number.isInteger(inputRoomId) || inputRoomId <= 0) {
    res.status(400).json({ error: 'Invalid roomId' });
    return;
  }

  const roomId = await roomManager.ensureRoom(inputRoomId);

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering

  res.write('data: {"type":"connected"}\n\n');

  const onEvent = (event: MonitorEvent) => {
    if (event.roomId === roomId) {
      res.write(`data: ${JSON.stringify(event)}\n\n`);
    }
  };

  const onDanmaku = (data: { roomId: number; uid: number; username: string; content: string; timestamp: number }) => {
    if (data.roomId === roomId) {
      res.write(`data: ${JSON.stringify({ type: 'danmaku', ...data })}\n\n`);
    }
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
