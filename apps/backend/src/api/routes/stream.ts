import { Router } from 'express';
import type { Request, Response } from 'express';
import { getStreamStatus } from '../../db/repositories/streamStatus.js';
import { config } from '../../config/index.js';

export const streamRouter = Router();

streamRouter.get('/status', (req: Request, res: Response) => {
  const status = getStreamStatus(config.BILIBILI_ROOM_ID);
  if (!status) {
    res.status(503).json({ error: 'Stream status not yet available' });
    return;
  }
  res.json(status);
});
