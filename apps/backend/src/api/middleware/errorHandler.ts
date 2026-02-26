import type { Request, Response, NextFunction } from 'express';

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  console.error('[API Error]', err);
  res.status(500).json({ error: err.message || 'Internal server error' });
}

export function notFound(req: Request, res: Response): void {
  res.status(404).json({ error: 'Not found' });
}
