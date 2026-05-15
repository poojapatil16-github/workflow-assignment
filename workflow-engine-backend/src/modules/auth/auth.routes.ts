import { Router } from 'express';
import { authMiddleware } from '../../middleware/auth.middleware.js';
import * as controller from './auth.controller.js';
import { loginValidators, registerValidators } from './auth.controller.js';

const router = Router();

router.post('/register', ...registerValidators, controller.register);
router.post('/login', ...loginValidators, controller.login);
router.get('/me', authMiddleware, controller.me);

export default router;
