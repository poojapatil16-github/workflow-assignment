import { Router } from 'express';
import { authMiddleware } from '../../middleware/auth.middleware.js';
import {
  tenantMiddleware,
  requireGlobalAdmin,
  requireAnyTenantScopedRole,
} from '../../middleware/tenant.middleware.js';
import * as controller from './workflow.controller.js';
import {
  createWorkflowValidators,
  listWorkflowsValidators,
  workflowIdValidators,
  newVersionValidators,
  publishWorkflowValidators,
} from './workflow.controller.js';

const router = Router();

router.use(authMiddleware, tenantMiddleware);

/** Runtime / catalog: CREATOR in tenant (platform ADMIN has implicit CREATOR). */
const workflowRead = requireAnyTenantScopedRole('CREATOR');

router.get('/', workflowRead, ...listWorkflowsValidators, controller.listWorkflows);
router.get('/:id', workflowRead, ...workflowIdValidators, controller.getWorkflow);

/** Definition management: platform ADMIN only. */
router.post('/', requireGlobalAdmin, ...createWorkflowValidators, controller.createWorkflow);
router.post('/:id/version', requireGlobalAdmin, ...workflowIdValidators, ...newVersionValidators, controller.createVersion);
router.post('/:id/publish', requireGlobalAdmin, ...workflowIdValidators, ...publishWorkflowValidators, controller.publishVersion);

export default router;
