import { Router } from 'express';
import { authMiddleware } from '../../middleware/auth.middleware.js';
import {
  tenantMiddleware,
  requireGlobalAdmin,
} from '../../middleware/tenant.middleware.js';
import * as controller from './audit.controller.js';
import { auditListValidators } from './audit.controller.js';

const router = Router();

router.get('/', authMiddleware, tenantMiddleware, requireGlobalAdmin, ...auditListValidators, controller.listAuditLogs);

export default router;
