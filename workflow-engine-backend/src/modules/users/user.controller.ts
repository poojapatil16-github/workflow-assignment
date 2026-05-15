import type { NextFunction, Request, Response } from 'express';
import { successResponse } from '../../common/responses/api-response.js';
import * as userService from './user.service.js';

export async function listUsers(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.tenantId) throw new Error('missing tenant');
    if (!req.auth) throw new Error('missing auth');
    const rows = await userService.listTenantUsers(req.tenantId);
    res.json(successResponse(rows));
  } catch (e) {
    next(e);
  }
}
