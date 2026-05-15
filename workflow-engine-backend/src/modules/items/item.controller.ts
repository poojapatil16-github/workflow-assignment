import type { Prisma } from '../../prisma.js';
import type { NextFunction, Request, Response } from 'express';
import { HEADER_IDEMPOTENCY_KEY } from '../../common/constants/http.js';
import { successResponse } from '../../common/responses/api-response.js';
import { buildPaginationMeta } from '../../common/utils/pagination.js';
import {
  getValidatedBody,
  getValidatedParams,
  getValidatedQuery,
  validateRequest,
} from '../../common/validators/validate-request.js';
import * as itemService from './item.service.js';
import {
  createItemBodySchema,
  itemIdParamsSchema,
  listItemsQuerySchema,
  transitionBodySchema,
} from './item.validator.js';
import type { z } from 'zod';

type CreateItemBody = z.infer<typeof createItemBodySchema>;
type ListItemsQuery = z.infer<typeof listItemsQuerySchema>;
type ItemIdParams = z.infer<typeof itemIdParamsSchema>;
type TransitionBody = z.infer<typeof transitionBodySchema>;

export const createItemValidators = [validateRequest(createItemBodySchema, 'body')];
export const listItemsValidators = [validateRequest(listItemsQuerySchema, 'query')];
export const itemIdValidators = [validateRequest(itemIdParamsSchema, 'params')];
export const transitionValidators = [validateRequest(transitionBodySchema, 'body')];

export async function createItem(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.auth || !req.tenantId) throw new Error('missing context');
    const body = getValidatedBody<CreateItemBody>(req);
    const item = await itemService.createItem({
      tenantId: req.tenantId,
      actorId: req.auth.userId,
      workflowId: body.workflowId,
      workflowVersionId: body.workflowVersionId,
      title: body.title,
      data: body.data as Prisma.InputJsonValue | undefined,
    });
    res.status(201).json(successResponse(item));
  } catch (e) {
    next(e);
  }
}

export async function listItems(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.tenantId) throw new Error('missing tenant');
    const query = getValidatedQuery<ListItemsQuery>(req);
    const { rows, total } = await itemService.listItems(req.tenantId, query);
    res.json(
      successResponse(rows, {
        pagination: buildPaginationMeta(query.page, query.limit, total),
      }),
    );
  } catch (e) {
    next(e);
  }
}

export async function getItem(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.tenantId) throw new Error('missing tenant');
    const params = getValidatedParams<ItemIdParams>(req);
    const item = await itemService.getItem(req.tenantId, params.id);
    res.json(successResponse(item));
  } catch (e) {
    next(e);
  }
}

export async function transitionItem(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.auth || !req.tenantId) throw new Error('missing context');
    const params = getValidatedParams<ItemIdParams>(req);
    const body = getValidatedBody<TransitionBody>(req);
    const rawKey = req.headers[HEADER_IDEMPOTENCY_KEY] ?? req.headers['idempotency-key'];
    const idempotencyKey = Array.isArray(rawKey) ? rawKey[0] : rawKey;
    const result = await itemService.applyTransition({
      tenantId: req.tenantId,
      actorUserId: req.auth.userId,
      itemId: params.id,
      transitionId: body.transitionId,
      clientVersion: body.clientVersion,
      comment: body.comment,
      idempotencyKey: idempotencyKey?.trim() || null,
    });
    res.json(successResponse(result));
  } catch (e) {
    next(e);
  }
}
