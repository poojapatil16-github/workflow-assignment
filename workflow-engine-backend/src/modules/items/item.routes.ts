import { Router } from 'express';
import { authMiddleware } from '../../middleware/auth.middleware.js';
import {
  tenantMiddleware,
  requireAnyTenantScopedRole,
  requireTenantCreator,
} from '../../middleware/tenant.middleware.js';
import * as controller from './item.controller.js';
import {
  createItemValidators,
  listItemsValidators,
  itemIdValidators,
  transitionValidators,
} from './item.controller.js';

const router = Router();

router.use(authMiddleware, tenantMiddleware);

router.get('/', requireAnyTenantScopedRole('CREATOR', 'APPROVER'), ...listItemsValidators, controller.listItems);
router.get('/:id', requireAnyTenantScopedRole('CREATOR', 'APPROVER'), ...itemIdValidators, controller.getItem);
router.post('/', requireTenantCreator, ...createItemValidators, controller.createItem);
router.post(
  '/:id/transitions',
  requireTenantCreator,
  ...itemIdValidators,
  ...transitionValidators,
  controller.transitionItem,
);

export default router;
