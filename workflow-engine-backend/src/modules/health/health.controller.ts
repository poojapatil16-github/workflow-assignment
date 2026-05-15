import type { Request, Response } from 'express';
import { prisma } from '../../config/prisma.js';

export async function health(_req: Request, res: Response) {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ success: true, data: { status: 'ok', database: 'up' }, meta: {} });
  } catch {
    res.status(503).json({ success: false, message: 'Database unavailable', errors: [] });
  }
}
