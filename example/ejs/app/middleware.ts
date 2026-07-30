import type { Request, Response, NextFunction } from 'express';

// Routes to ignore by folder middleware
export const ignore = ['/api/health'];

export default function globalMiddleware(req: Request, res: Response, next: NextFunction) {
  res.setHeader('X-Nxpress-Global-Mw', 'enabled');
  next();
}
