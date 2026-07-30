import type { Request, Response, NextFunction } from 'express';

// Routes to ignore by folder middleware
export const ignore = ['/api/health'];

export function globalMiddleware(req: Request, res: Response, next: NextFunction) {
  res.setHeader('X-Nxpress-Global-Mw', 'enabled');
  console.log('globalMiddleware');
}

export function tesst(req: Request, res: Response, next: NextFunction) {
  res.setHeader('X-Nxpress-Global-Mw', 'enabled');
  console.log('globalMiddleware2');
}
