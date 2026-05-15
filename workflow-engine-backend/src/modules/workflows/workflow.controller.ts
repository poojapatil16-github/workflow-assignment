import type { NextFunction, Request, Response } from 'express';
import { successResponse } from '../../common/responses/api-response.js';
import { buildPaginationMeta } from '../../common/utils/pagination.js';
import {
  getValidatedBody,
  getValidatedParams,
  getValidatedQuery,
  validateRequest,
} from '../../common/validators/validate-request.js';
import { uuidParam } from '../../common/validators/common.js';
import * as workflowService from './workflow.service.js';
import {
  createWorkflowBodySchema,
  listWorkflowsQuerySchema,
  newWorkflowVersionBodySchema,
  publishWorkflowBodySchema,
} from './workflow.validator.js';
import type { z } from 'zod';

type CreateWorkflowBody = z.infer<typeof createWorkflowBodySchema>;
type ListWorkflowsQuery = z.infer<typeof listWorkflowsQuerySchema>;
type WorkflowIdParams = z.infer<typeof uuidParam>;
type NewVersionBody = z.infer<typeof newWorkflowVersionBodySchema>;
type PublishWorkflowBody = z.infer<typeof publishWorkflowBodySchema>;

export const createWorkflowValidators = [validateRequest(createWorkflowBodySchema, 'body')];
export const listWorkflowsValidators = [validateRequest(listWorkflowsQuerySchema, 'query')];
export const workflowIdValidators = [validateRequest(uuidParam, 'params')];
export const newVersionValidators = [validateRequest(newWorkflowVersionBodySchema, 'body')];
export const publishWorkflowValidators = [
  validateRequest(uuidParam, 'params'),
  validateRequest(publishWorkflowBodySchema, 'body'),
];

export async function createWorkflow(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.auth || !req.tenantId) throw new Error('missing context');
    const body = getValidatedBody<CreateWorkflowBody>(req);
    const result = await workflowService.createWorkflow(req.tenantId, req.auth.userId, body);
    res.status(201).json(successResponse(result));
  } catch (e) {
    next(e);
  }
}

export async function listWorkflows(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.tenantId) throw new Error('missing tenant');
    const query = getValidatedQuery<ListWorkflowsQuery>(req);
    const { rows, total } = await workflowService.listWorkflows(req.tenantId, query);
    res.json(
      successResponse(rows, {
        pagination: buildPaginationMeta(query.page, query.limit, total),
      }),
    );
  } catch (e) {
    next(e);
  }
}

export async function getWorkflow(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.tenantId) throw new Error('missing tenant');
    const params = getValidatedParams<WorkflowIdParams>(req);
    const wf = await workflowService.getWorkflow(req.tenantId, params.id);
    res.json(successResponse(wf));
  } catch (e) {
    next(e);
  }
}

export async function createVersion(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.auth || !req.tenantId) throw new Error('missing context');
    const params = getValidatedParams<WorkflowIdParams>(req);
    const body = getValidatedBody<NewVersionBody>(req);
    const version = await workflowService.createDraftVersion(
      req.tenantId,
      params.id,
      req.auth.userId,
      body,
    );
    res.status(201).json(successResponse(version));
  } catch (e) {
    next(e);
  }
}

export async function publishVersion(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.auth || !req.tenantId) throw new Error('missing context');
    const params = getValidatedParams<WorkflowIdParams>(req);
    const body = getValidatedBody<PublishWorkflowBody>(req);
    const published = await workflowService.publishWorkflowVersion(
      req.tenantId,
      params.id,
      body.versionId,
      req.auth.userId,
    );
    res.json(successResponse(published));
  } catch (e) {
    next(e);
  }
}
