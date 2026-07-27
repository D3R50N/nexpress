import type { Request, Response } from 'express';

export function get(req: Request, res: Response) {
  res.json({
    status: 'ok',
    engine: 'ejs',
    framework: 'Nexpress',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
}
