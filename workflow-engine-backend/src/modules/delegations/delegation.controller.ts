import type { Prisma } from '../../prisma.js';
import type { NextFunction, Request, Response } from 'express';
import { successResponse } from '../../common/responses/api-response.js';
import { getValidatedBody, validateRequest } from '../../common/validators/validate-request.js';
import * as delegationService from './delegation.service.js';
import { createDelegationBodySchema } from './delegation.validator.js';
import type { z } from 'zod';

type CreateDelegationBody = z.infer<typeof createDelegationBodySchema>;

export const createDelegationValidators = [validateRequest(createDelegationBodySchema, 'body')];

export async function createDelegation(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.auth || !req.tenantId) throw new Error('missing context');
    const body = getValidatedBody<CreateDelegationBody>(req);
    const row = await delegationService.createDelegationWithAudit({
      tenantId: req.tenantId,
      actorId: req.auth.userId,
      fromUserId: body.fromUserId,
      toUserId: body.toUserId,
      metadata: body.metadata as Prisma.InputJsonValue | undefined,
    });
    res.status(201).json(successResponse(row));
  } catch (e) {
    next(e);
  }
}

export async function listDelegations(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.tenantId) throw new Error('missing tenant');
    const rows = await delegationService.listDelegations(req.tenantId);
    res.json(successResponse(rows));
  } catch (e) {
    next(e);
  }
}
