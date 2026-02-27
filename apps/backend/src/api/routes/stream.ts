import { Router } from 'express';
import type { Request, Response } from 'express';
import { getStreamStatus } from '../../db/repositories/streamStatus.js';

export const streamRouter = Router();

streamRouter.get('/status', (req: Request, res: Response) => {
  const roomId = (req as Request & { roomId: number }).roomId;
  const status = getStreamStatus(roomId);
  if (!status) {
    res.status(503).json({ error: 'Stream status not yet available' });
    return;
  }
  res.json(status);
});
