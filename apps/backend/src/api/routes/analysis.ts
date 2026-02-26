import { Router } from 'express';
import type { Request, Response } from 'express';
import { getLatestEventByType } from '../../db/repositories/events.js';
import { config } from '../../config/index.js';

export const analysisRouter = Router();

analysisRouter.get('/latest', (req: Request, res: Response) => {
  const event = getLatestEventByType(config.BILIBILI_ROOM_ID, 'llm_analysis');
  if (!event) {
    res.status(404).json({ error: 'No analysis available yet' });
    return;
  }
  res.json(event);
});
