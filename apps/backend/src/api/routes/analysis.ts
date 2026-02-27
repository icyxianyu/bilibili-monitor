import { Router } from 'express';
import type { Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { getLatestEventByType, insertEvent } from '../../db/repositories/events.js';
import { listDanmaku } from '../../db/repositories/danmaku.js';
import { analyzeDanmaku } from '../../analysis/llm-client.js';
import { eventBus } from '../../core/event-bus.js';
import { config } from '../../config/index.js';
import type { LlmAnalysisEvent } from '@bilibili-monitor/shared';

export const analysisRouter = Router();

const MAX_WINDOW_MS = 10 * 60_000; // 10 minutes hard cap

analysisRouter.get('/latest', (req: Request, res: Response) => {
  const roomId = (req as Request & { roomId: number }).roomId;
  const event = getLatestEventByType(roomId, 'llm_analysis');
  if (!event) {
    res.status(404).json({ error: 'No analysis available yet' });
    return;
  }
  res.json(event);
});

analysisRouter.post('/manual', async (req: Request, res: Response) => {
  if (!config.LLM_API_KEY) {
    res.status(503).json({ error: 'LLM not configured' });
    return;
  }

  const roomId = (req as Request & { roomId: number }).roomId;
  const now = Date.now();
  let { since, until } = req.body as { since?: number; until?: number };

  until = until ?? now;
  since = since ?? until - 5 * 60_000;

  // Enforce cap
  if (until - since > MAX_WINDOW_MS) {
    since = until - MAX_WINDOW_MS;
  }

  const records = listDanmaku({
    roomId,
    since,
    until,
    limit: 500,
  });

  if (records.length === 0) {
    res.status(422).json({ error: '该时段内无弹幕数据' });
    return;
  }

  const danmakuContents = records
    .slice()
    .reverse()
    .map((d) => `${d.username}: ${d.content}`);

  // Manual analysis is standalone — no previousSummary so it doesn't bleed into auto chain
  try {
    const result = await analyzeDanmaku(danmakuContents);

    const analysisEvent: LlmAnalysisEvent = {
      id: randomUUID(),
      roomId,
      type: 'llm_analysis',
      // Use the end of the analyzed window as the event time, not now
      createdAt: new Date(until),
      trigger: 'manual',
      windowSince: since,
      windowUntil: until,
      summary: result.summary,
      sentiment: result.sentiment,
      significantChange: result.significantChange,
      changeDescription: result.changeDescription,
      topKeywords: result.topKeywords,
    };

    insertEvent(analysisEvent);
    eventBus.emitMonitorEvent(analysisEvent);

    res.json(analysisEvent);
  } catch (err) {
    console.error('[Analysis] Manual analysis error:', err);
    res.status(500).json({ error: 'LLM analysis failed' });
  }
});
