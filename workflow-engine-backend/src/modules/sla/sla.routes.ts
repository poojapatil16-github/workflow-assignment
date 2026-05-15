import { Router } from 'express';
import { authMiddleware } from '../../middleware/auth.middleware.js';
import {
  tenantMiddleware,
  requireGlobalAdmin,
  requireAnyTenantScopedRole,
} from '../../middleware/tenant.middleware.js';
import * as controller from './sla.controller.js';
import { createSlaValidators, listSlaValidators, escalateItemValidators } from './sla.controller.js';

const router = Router();

router.use(authMiddleware, tenantMiddleware);

router.get('/', requireGlobalAdmin, ...listSlaValidators, controller.listSlaRules);
router.post('/', requireGlobalAdmin, ...createSlaValidators, controller.createSlaRule);

router.get('/tenants/:tenantId/breaches', requireAnyTenantScopedRole('CREATOR', 'APPROVER'), controller.getBreaches);
router.post('/items/:id/escalate', requireAnyTenantScopedRole('CREATOR', 'APPROVER'), ...escalateItemValidators, controller.escalateItem);

export default router;
