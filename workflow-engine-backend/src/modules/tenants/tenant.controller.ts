import type { NextFunction, Request, Response } from 'express';
import { successResponse } from '../../common/responses/api-response.js';
import {
  getValidatedBody,
  getValidatedParams,
  validateRequest,
} from '../../common/validators/validate-request.js';
import type { z } from 'zod';
import * as tenantService from './tenant.service.js';
import {
  addMemberBodySchema,
  createTenantBodySchema,
  patchMemberRolesBodySchema,
  tenantAndMemberUserParamsSchema,
  tenantIdParamsSchema,
} from './tenant.validator.js';

type CreateTenantBody = z.infer<typeof createTenantBodySchema>;
type TenantIdParams = z.infer<typeof tenantIdParamsSchema>;
type AddMemberBody = z.infer<typeof addMemberBodySchema>;
type PatchMemberRolesBody = z.infer<typeof patchMemberRolesBodySchema>;
type TenantAndMemberUserParams = z.infer<typeof tenantAndMemberUserParamsSchema>;

export const createTenantValidators = [validateRequest(createTenantBodySchema, 'body')];

export async function createTenant(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.auth) throw new Error('missing auth');
    const body = getValidatedBody<CreateTenantBody>(req);
    const tenant = await tenantService.createTenant(req.auth.userId, body);
    res.status(201).json(successResponse(tenant));
  } catch (e) {
    next(e);
  }
}

export async function listTenants(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.auth) throw new Error('missing auth');
    const tenants = await tenantService.listTenantsForUser(req.auth.userId, req.auth.globalRole);
    res.json(successResponse(tenants));
  } catch (e) {
    next(e);
  }
}

export const listMembersValidators = [validateRequest(tenantIdParamsSchema, 'params')];

export async function listMembers(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.auth) throw new Error('missing auth');
    const params = getValidatedParams<TenantIdParams>(req);
    if (params.id !== req.tenantId) {
      return res.status(403).json({
        success: false,
        message: 'Tenant mismatch',
        errors: [{ code: 'TENANT_MISMATCH' }],
      });
    }
    const members = await tenantService.listMembersForTenant(params.id);
    res.json(successResponse(members));
  } catch (e) {
    next(e);
  }
}

export const addMemberValidators = [
  validateRequest(tenantIdParamsSchema, 'params'),
  validateRequest(addMemberBodySchema, 'body'),
];

export async function addMember(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.auth) throw new Error('missing auth');
    const params = getValidatedParams<TenantIdParams>(req);
    if (params.id !== req.tenantId) {
      return res.status(403).json({
        success: false,
        message: 'Tenant mismatch',
        errors: [{ code: 'TENANT_MISMATCH' }],
      });
    }
    const body = getValidatedBody<AddMemberBody>(req);
    const member = await tenantService.addMember(params.id, body);
    res.status(201).json(successResponse(member));
  } catch (e) {
    next(e);
  }
}

/** Params for PATCH must validate both `id` and `userId` on the merged params object */
export const patchMemberRolesValidators = [
  validateRequest(tenantAndMemberUserParamsSchema, 'params'),
  validateRequest(patchMemberRolesBodySchema, 'body'),
];

export async function patchMemberRoles(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.auth) throw new Error('missing auth');
    const params = getValidatedParams<TenantAndMemberUserParams>(req);
    if (params.id !== req.tenantId) {
      return res.status(403).json({
        success: false,
        message: 'Tenant mismatch',
        errors: [{ code: 'TENANT_MISMATCH' }],
      });
    }
    const body = getValidatedBody<PatchMemberRolesBody>(req);
    const member = await tenantService.updateMemberRoles(params.id, params.userId, body.roles);
    res.json(successResponse(member));
  } catch (e) {
    next(e);
  }
}

export const removeMemberValidators = [validateRequest(tenantAndMemberUserParamsSchema, 'params')];

export async function removeMember(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.auth) throw new Error('missing auth');
    const params = getValidatedParams<TenantAndMemberUserParams>(req);
    if (params.id !== req.tenantId) {
      return res.status(403).json({
        success: false,
        message: 'Tenant mismatch',
        errors: [{ code: 'TENANT_MISMATCH' }],
      });
    }
    await tenantService.removeMember(params.id, params.userId);
    res.status(204).end();
  } catch (e) {
    next(e);
  }
}
