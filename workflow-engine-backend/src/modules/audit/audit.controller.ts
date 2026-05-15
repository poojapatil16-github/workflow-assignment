import type { NextFunction, Request, Response } from 'express';
import { successResponse } from '../../common/responses/api-response.js';
import { buildPaginationMeta, paginationQuerySchema } from '../../common/utils/pagination.js';
import { getValidatedQuery, validateRequest } from '../../common/validators/validate-request.js';
import * as auditService from './audit.service.js';
import type { z } from 'zod';

type AuditQuery = z.infer<typeof paginationQuerySchema>;

export const auditListValidators = [validateRequest(paginationQuerySchema, 'query')];

export async function listAuditLogs(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.tenantId) throw new Error('missing tenant');
    const query = getValidatedQuery<AuditQuery>(req);
    const { rows, total } = await auditService.listAuditLogs({
      tenantId: req.tenantId,
      page: query.page,
      limit: query.limit,
      search: query.search,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
    });
    res.json(
      successResponse(rows, {
        pagination: buildPaginationMeta(query.page, query.limit, total),
      }),
    );
  } catch (e) {
    next(e);
  }
}
