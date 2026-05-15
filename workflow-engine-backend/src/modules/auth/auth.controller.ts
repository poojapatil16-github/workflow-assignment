import type { Request, Response, NextFunction } from 'express';
import { successResponse } from '../../common/responses/api-response.js';
import { getValidatedBody, validateRequest } from '../../common/validators/validate-request.js';
import * as authService from './auth.service.js';
import type { LoginBody, RegisterBody } from './auth.validator.js';
import { loginBodySchema, registerBodySchema } from './auth.validator.js';

export const loginValidators = [validateRequest(loginBodySchema, 'body')];
export const registerValidators = [validateRequest(registerBodySchema, 'body')];

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const body = getValidatedBody<LoginBody>(req);
    const result = await authService.loginWithEmailPassword(body.email, body.password);
    res.json(successResponse(result));
  } catch (e) {
    next(e);
  }
}

export async function register(req: Request, res: Response, next: NextFunction) {
  try {
    const body = getValidatedBody<RegisterBody>(req);
    const result = await authService.registerWithEmailPassword({
      email: body.email,
      password: body.password,
      name: body.name,
      globalRole: body.globalRole,
    });
    res.status(201).json(successResponse(result));
  } catch (e) {
    next(e);
  }
}

export async function me(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.auth) throw new Error('auth missing');
    const user = await authService.getMe(req.auth.userId);
    res.json(successResponse(user));
  } catch (e) {
    next(e);
  }
}
