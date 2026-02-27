import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { eventsRouter } from './routes/events.js';
import { streamRouter } from './routes/stream.js';
import { danmakuRouter } from './routes/danmaku.js';
import { analysisRouter } from './routes/analysis.js';
import { roomManager } from '../core/room-manager.js';

export const apiRouter = Router();

// /api/rooms/:roomId/... middleware
const roomsRouter = Router({ mergeParams: true });

roomsRouter.use(async (req: Request, res: Response, next: NextFunction) => {
  const inputRoomId = Number((req.params as Record<string, string>)['roomId']);
  if (!Number.isInteger(inputRoomId) || inputRoomId <= 0) {
    res.status(400).json({ error: 'Invalid roomId' });
    return;
  }
  const realRoomId = await roomManager.ensureRoom(inputRoomId);
  (req as Request & { roomId: number }).roomId = realRoomId;
  next();
});

roomsRouter.use('/events', eventsRouter);
roomsRouter.use('/stream', streamRouter);
roomsRouter.use('/danmaku', danmakuRouter);
roomsRouter.use('/analysis', analysisRouter);

apiRouter.use('/rooms/:roomId', roomsRouter);
