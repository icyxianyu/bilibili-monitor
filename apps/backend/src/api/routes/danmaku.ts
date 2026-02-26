import { Router } from 'express';
import type { Request, Response } from 'express';
import { listDanmaku } from '../../db/repositories/danmaku.js';
import { config } from '../../config/index.js';

export const danmakuRouter = Router();

danmakuRouter.get('/', (req: Request, res: Response) => {
  const since = req.query['since'] ? Number(req.query['since']) : undefined;
  const limit = Math.min(Number(req.query['limit'] ?? 100), 500);

  const items = listDanmaku({
    roomId: config.BILIBILI_ROOM_ID,
    since,
    limit,
  });

  res.json({ danmaku: items, limit });
});
