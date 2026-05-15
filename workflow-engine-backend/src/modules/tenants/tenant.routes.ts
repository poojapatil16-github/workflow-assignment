import { Router } from 'express';
import { authMiddleware } from '../../middleware/auth.middleware.js';
import {
  requireAnyTenantScopedRole,
  requireGlobalAdmin,
  tenantMiddleware,
} from '../../middleware/tenant.middleware.js';
import * as controller from './tenant.controller.js';
import {
  addMemberValidators,
  createTenantValidators,
  listMembersValidators,
  patchMemberRolesValidators,
  removeMemberValidators,
} from './tenant.controller.js';

const router = Router();

router.use(authMiddleware);

router.get('/', controller.listTenants);
router.post('/', requireGlobalAdmin, ...createTenantValidators, controller.createTenant);

router.get('/:id/members', tenantMiddleware, requireAnyTenantScopedRole('CREATOR', 'APPROVER'), ...listMembersValidators, controller.listMembers);
router.post('/:id/members', tenantMiddleware, requireGlobalAdmin, ...addMemberValidators, controller.addMember);
router.patch(
  '/:id/members/:userId',
  tenantMiddleware,
  requireGlobalAdmin,
  ...patchMemberRolesValidators,
  controller.patchMemberRoles,
);
router.delete(
  '/:id/members/:userId',
  tenantMiddleware,
  requireGlobalAdmin,
  ...removeMemberValidators,
  controller.removeMember,
);

export default router;
