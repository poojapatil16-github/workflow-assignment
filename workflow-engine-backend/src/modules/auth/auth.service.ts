import bcrypt from 'bcrypt';
import jwt, { type SignOptions } from 'jsonwebtoken';
import { prisma } from '../../config/prisma.js';
import { env } from '../../config/env.js';
import { Errors } from '../../common/errors/AppError.js';
import type { GlobalRole } from '../../prisma.js';
import { logger } from '../../common/logger/logger.js';

function signToken(user: { id: string; email: string; globalRole: GlobalRole }) {
  const signOptions: SignOptions = { expiresIn: env.JWT_EXPIRES_IN as SignOptions['expiresIn'] };
  return jwt.sign(
    { userId: user.id, email: user.email, sub: user.id, globalRole: user.globalRole },
    env.JWT_SECRET,
    signOptions,
  );
}

export async function registerWithEmailPassword(input: {
  email: string;
  password: string;
  name?: string;
  globalRole: GlobalRole;
}) {
  const email = input.email.toLowerCase().trim();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    logger.warn('[AuthService] Registration failed: user already exists', { email });
    throw Errors.conflict('User already exists with this email');
  }
  const passwordHash = await hashPassword(input.password);
  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      name: input.name?.trim() || null,
      globalRole: input.globalRole,
    },
  });
  logger.info('[AuthService] User registered successfully', { userId: user.id, email: user.email, globalRole: user.globalRole });
  const token = signToken(user);
  return {
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      status: user.status,
      globalRole: user.globalRole,
    },
  };
}

export async function loginWithEmailPassword(email: string, password: string) {
  const normalizedEmail = email.toLowerCase().trim();
  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });
  if (!user) {
    logger.warn('[AuthService] Login failed: user not found', { email: normalizedEmail });
    throw Errors.unauthorized('Invalid credentials');
  }
  if (user.status !== 'ACTIVE') {
    logger.warn('[AuthService] Login failed: user inactive', { userId: user.id, email: user.email });
    throw Errors.unauthorized('Invalid credentials');
  }
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) {
    logger.warn('[AuthService] Login failed: incorrect password', { userId: user.id, email: user.email });
    throw Errors.unauthorized('Invalid credentials');
  }
  logger.info('[AuthService] User logged in successfully', { userId: user.id, email: user.email });
  const token = signToken(user);
  return {
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      status: user.status,
      globalRole: user.globalRole,
    },
  };
}

export async function getMe(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      status: true,
      globalRole: true,
      memberships: {
        select: {
          roles: true,
          tenant: { select: { id: true, name: true, slug: true } },
        },
      },
      delegationsTo: {
        where: { active: true },
        select: {
          tenantId: true,
        },
      },
    },
  });
  if (!user) {
    throw Errors.notFound('User');
  }
  return user;
}

export async function hashPassword(plain: string) {
  return bcrypt.hash(plain, env.BCRYPT_ROUNDS);
}
