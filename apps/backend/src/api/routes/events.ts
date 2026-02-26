import { Router } from 'express';
import type { Request, Response } from 'express';
import { listEvents } from '../../db/repositories/events.js';
import { config } from '../../config/index.js';

export const eventsRouter = Router();

eventsRouter.get('/', (req: Request, res: Response) => {
  const limit = Math.min(Number(req.query['limit'] ?? 50), 200);
  const offset = Number(req.query['offset'] ?? 0);
  const type = req.query['type'] as string | undefined;

  const events = listEvents({
    roomId: config.BILIBILI_ROOM_ID,
    limit,
    offset,
    type,
  });

  res.json({ events, limit, offset });
});
