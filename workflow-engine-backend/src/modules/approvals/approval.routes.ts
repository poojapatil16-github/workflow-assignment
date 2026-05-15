import { Router } from 'express';
import { authMiddleware } from '../../middleware/auth.middleware.js';
import {
  tenantMiddleware,
  requireTenantApprover,
} from '../../middleware/tenant.middleware.js';
import * as controller from './approval.controller.js';
import {
  approvalDecisionValidators,
  approvalIdValidators,
} from './approval.controller.js';

const router = Router();

router.use(authMiddleware, tenantMiddleware, requireTenantApprover);

router.get('/pending', controller.listPending);
router.post('/:id/approve', ...approvalIdValidators, ...approvalDecisionValidators, controller.approve);
router.post('/:id/reject', ...approvalIdValidators, ...approvalDecisionValidators, controller.reject);

export default router;
