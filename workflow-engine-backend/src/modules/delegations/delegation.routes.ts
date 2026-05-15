import { Router } from 'express';
import { authMiddleware } from '../../middleware/auth.middleware.js';
import {
  tenantMiddleware,
  requireAnyTenantScopedRole,
} from '../../middleware/tenant.middleware.js';
import * as controller from './delegation.controller.js';
import { createDelegationValidators } from './delegation.controller.js';

const router = Router();

router.use(authMiddleware, tenantMiddleware, requireAnyTenantScopedRole('CREATOR', 'APPROVER'));

router.post('/', ...createDelegationValidators, controller.createDelegation);
router.get('/', controller.listDelegations);

export default router;
