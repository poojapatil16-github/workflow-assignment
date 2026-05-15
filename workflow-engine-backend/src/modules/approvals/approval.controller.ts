import type { NextFunction, Request, Response } from 'express';
import { successResponse } from '../../common/responses/api-response.js';
import {
  getValidatedParams,
  getValidatedBody,
  validateRequest,
} from '../../common/validators/validate-request.js';
import * as approvalService from './approval.service.js';
import { approvalDecisionBodySchema, approvalIdParamsSchema } from './approval.validator.js';
import type { z } from 'zod';

type ApprovalIdParams = z.infer<typeof approvalIdParamsSchema>;
type ApprovalDecisionBody = z.infer<typeof approvalDecisionBodySchema>;

export const approvalIdValidators = [validateRequest(approvalIdParamsSchema, 'params')];
export const approvalDecisionValidators = [validateRequest(approvalDecisionBodySchema, 'body')];

export async function listPending(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.auth || !req.tenantId) throw new Error('missing context');
    const rows = await approvalService.listPendingApprovalsForUser(req.tenantId, req.auth.userId);
    res.json(successResponse(rows));
  } catch (e) {
    next(e);
  }
}

export async function approve(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.auth || !req.tenantId) throw new Error('missing context');
    const params = getValidatedParams<ApprovalIdParams>(req);
    const body = getValidatedBody<ApprovalDecisionBody>(req);
    const result = await approvalService.approveOrReject({
      tenantId: req.tenantId,
      actorUserId: req.auth.userId,
      approvalId: params.id,
      decision: 'APPROVE',
      comment: body.comment,
    });
    res.json(successResponse(result));
  } catch (e) {
    next(e);
  }
}

export async function reject(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.auth || !req.tenantId) throw new Error('missing context');
    const params = getValidatedParams<ApprovalIdParams>(req);
    const body = getValidatedBody<ApprovalDecisionBody>(req);
    const result = await approvalService.approveOrReject({
      tenantId: req.tenantId,
      actorUserId: req.auth.userId,
      approvalId: params.id,
      decision: 'REJECT',
      comment: body.comment,
    });
    res.json(successResponse(result));
  } catch (e) {
    next(e);
  }
}
