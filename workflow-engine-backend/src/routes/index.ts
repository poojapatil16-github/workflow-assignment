import { Router } from 'express';
import authRoutes from '../modules/auth/auth.routes.js';
import tenantRoutes from '../modules/tenants/tenant.routes.js';
import workflowRoutes from '../modules/workflows/workflow.routes.js';
import itemRoutes from '../modules/items/item.routes.js';
import approvalRoutes from '../modules/approvals/approval.routes.js';
import delegationRoutes from '../modules/delegations/delegation.routes.js';
import auditRoutes from '../modules/audit/audit.routes.js';
import slaRoutes from '../modules/sla/sla.routes.js';
import userRoutes from '../modules/users/user.routes.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/tenants', tenantRoutes);
router.use('/workflows', workflowRoutes);
router.use('/items', itemRoutes);
router.use('/approvals', approvalRoutes);
router.use('/delegations', delegationRoutes);
router.use('/audit-logs', auditRoutes);
router.use('/sla-rules', slaRoutes);
router.use('/users', userRoutes);

export default router;
