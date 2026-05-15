import { Router } from 'express';
import { authMiddleware } from '../../middleware/auth.middleware.js';
import {
  tenantMiddleware,
  requireGlobalAdmin,
} from '../../middleware/tenant.middleware.js';
import * as controller from './user.controller.js';

const router = Router();

router.get('/', authMiddleware, tenantMiddleware, requireGlobalAdmin, controller.listUsers);

export default router;
