import { Router } from 'express';
import type { Request, Response } from 'express';
import { listDanmaku, getDanmakuBuckets, getEarliestDanmakuTimestamp } from '../../db/repositories/danmaku.js';

export const danmakuRouter = Router();

danmakuRouter.get('/', (req: Request, res: Response) => {
  const roomId = (req as Request & { roomId: number }).roomId;
  const since = req.query['since'] ? Number(req.query['since']) : undefined;
  const until = req.query['until'] ? Number(req.query['until']) : undefined;
  const limit = Math.min(Number(req.query['limit'] ?? 100), 500);

  const items = listDanmaku({
    roomId,
    since,
    until,
    limit,
  });

  res.json({ danmaku: items, limit });
});

danmakuRouter.get('/buckets', (req: Request, res: Response) => {
  const roomId = (req as Request & { roomId: number }).roomId;
  const now = Date.now();
  const since = req.query['since'] ? Number(req.query['since']) : now - 60 * 60_000;
  const until = req.query['until'] ? Number(req.query['until']) : now;

  const buckets = getDanmakuBuckets({
    roomId,
    since,
    until,
  });

  res.json({ buckets, since, until });
});

danmakuRouter.get('/earliest', (req: Request, res: Response) => {
  const roomId = (req as Request & { roomId: number }).roomId;
  const ts = getEarliestDanmakuTimestamp(roomId);
  res.json({ timestamp: ts });
});
