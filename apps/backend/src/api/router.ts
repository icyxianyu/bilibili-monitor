import { Router } from 'express';
import { eventsRouter } from './routes/events.js';
import { streamRouter } from './routes/stream.js';
import { danmakuRouter } from './routes/danmaku.js';
import { sseRouter } from './routes/sse.js';
import { analysisRouter } from './routes/analysis.js';

export const apiRouter = Router();

apiRouter.use('/events', eventsRouter);
apiRouter.use('/stream', streamRouter);
apiRouter.use('/danmaku', danmakuRouter);
apiRouter.use('/analysis', analysisRouter);
