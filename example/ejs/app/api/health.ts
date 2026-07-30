import type { Request, Response } from 'express';

export function get(req: Request, res: Response) {
  return {
    status: 'ok',
    engine: 'ejs',
    framework: 'Nexpress',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  };
}


export function middleware(req: Request, res: Response) {
  console.log('Health');
}
