import type { Prisma } from '../../prisma.js';
import type { NextFunction, Request, Response } from 'express';
import { successResponse } from '../../common/responses/api-response.js';
import { buildPaginationMeta } from '../../common/utils/pagination.js';
import {
  getValidatedBody,
  getValidatedQuery,
  validateRequest,
} from '../../common/validators/validate-request.js';
import * as slaService from './sla.service.js';
import { createSlaRuleBodySchema, listSlaRulesQuerySchema, escalateItemBodySchema } from './sla.validator.js';
import type { z } from 'zod';

type CreateSlaBody = z.infer<typeof createSlaRuleBodySchema>;
type ListSlaQuery = z.infer<typeof listSlaRulesQuerySchema>;
type EscalateItemBody = z.infer<typeof escalateItemBodySchema>;

export const createSlaValidators = [validateRequest(createSlaRuleBodySchema, 'body')];
export const listSlaValidators = [validateRequest(listSlaRulesQuerySchema, 'query')];
export const escalateItemValidators = [validateRequest(escalateItemBodySchema, 'body')];

export async function createSlaRule(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.auth || !req.tenantId) throw new Error('missing context');
    const body = getValidatedBody<CreateSlaBody>(req);
    const rule = await slaService.createSlaRule({
      tenantId: req.tenantId,
      actorId: req.auth.userId,
      workflowVersionId: body.workflowVersionId,
      workflowStateId: body.workflowStateId,
      name: body.name,
      durationMinutes: body.durationMinutes,
      escalateToUserId: body.escalateToUserId,
      metadata: body.metadata as Prisma.InputJsonValue | undefined,
      enabled: body.enabled,
    });
    res.status(201).json(successResponse(rule));
  } catch (e) {
    next(e);
  }
}

export async function listSlaRules(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.tenantId) throw new Error('missing tenant');
    const query = getValidatedQuery<ListSlaQuery>(req);
    const { rows, total } = await slaService.listSlaRules(req.tenantId, query);
    res.json(
      successResponse(rows, {
        pagination: buildPaginationMeta(query.page, query.limit, total),
      }),
    );
  } catch (e) {
    next(e);
  }
}

export async function getBreaches(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.tenantId) throw new Error('missing tenant');
    const breaches = await slaService.getSlaBreaches(req.tenantId);
    res.json(successResponse(breaches));
  } catch (e) {
    next(e);
  }
}

export async function escalateItem(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.auth || !req.tenantId) throw new Error('missing context');
    const itemId = req.params.id as string;
    const body = getValidatedBody<EscalateItemBody>(req);
    const escalation = await slaService.escalateItem({
      tenantId: req.tenantId,
      actorId: req.auth.userId,
      itemId,
      slaRuleId: body.slaRuleId,
    });
    res.json(successResponse(escalation, { message: 'Escalation email sent successfully' }));
  } catch (e) {
    next(e);
  }
}
