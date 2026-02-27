import { Router } from 'express';
import type { Request, Response } from 'express';
import { listEvents, countEvents } from '../../db/repositories/events.js';

export const eventsRouter = Router();

eventsRouter.get('/', (req: Request, res: Response) => {
  const roomId = (req as Request & { roomId: number }).roomId;
  const limit = Math.min(Number(req.query['limit'] ?? 50), 200);
  const offset = Number(req.query['offset'] ?? 0);
  const type = req.query['type'] as string | undefined;
  const date = req.query['date'] as string | undefined;

  const events = listEvents({
    roomId,
    limit,
    offset,
    type,
    date,
  });

  const total = countEvents({
    roomId,
    type,
    date,
  });

  res.json({ events, limit, offset, total });
});
