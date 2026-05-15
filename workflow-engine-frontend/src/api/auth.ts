import { z } from 'zod';
import { apiClient } from '@/api/client';
import { PATHS } from '@/api/paths';
import { parseSuccessData } from '@/api/schemas';

export const loginBodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
});
export type LoginBody = z.infer<typeof loginBodySchema>;

export const registerBodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
  name: z.string().min(1).max(120).optional(),
  globalRole: z.enum(['ADMIN', 'USER']),
});
export type RegisterBody = z.infer<typeof registerBodySchema>;

const tenantScopedRolesSchema = z.array(z.enum(['CREATOR', 'APPROVER']));

export const loginDataSchema = z.object({
  token: z.string(),
  user: z.object({
    id: z.string(),
    email: z.string(),
    name: z.string().nullable().optional(),
    status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
    globalRole: z.enum(['ADMIN', 'USER']).optional(),
  }),
});

export async function login(body: LoginBody) {
  const res = await apiClient.post(PATHS.authLogin, loginBodySchema.parse(body));
  return parseSuccessData(loginDataSchema, res.data);
}

export async function register(body: RegisterBody) {
  const res = await apiClient.post(PATHS.authRegister, registerBodySchema.parse(body));
  return parseSuccessData(loginDataSchema, res.data);
}

export const meUserSchema = z.object({
  id: z.string(),
  email: z.string(),
  name: z.string().nullable().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
  globalRole: z.enum(['ADMIN', 'USER']),
  memberships: z.array(
    z.object({
      roles: tenantScopedRolesSchema,
      tenant: z.object({
        id: z.string(),
        name: z.string(),
        slug: z.string(),
      }),
    }),
  ),
});
export type MeUser = z.infer<typeof meUserSchema>;

export async function fetchMe() {
  const res = await apiClient.get(PATHS.authMe);
  return parseSuccessData(meUserSchema, res.data);
}
