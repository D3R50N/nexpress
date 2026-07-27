import type { Request, Response } from 'express';

export async function props(req: Request, res: Response) {
  return {
    title: 'À Propos',
  };
}
