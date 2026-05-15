import type { TenantScopedRole, UserStatus, GlobalRole } from '../../prisma.js';
import { prisma } from '../../config/prisma.js';
import { Errors } from '../../common/errors/AppError.js';

export type TenantMemberAdminDto = {
  membershipId: string;
  tenantId: string;
  userId: string;
  email: string;
  name: string | null;
  roles: TenantScopedRole[];
  /** Tenant ids where this member also belongs (helps admins see overlaps). */
  tenantIds: string[];
  status: UserStatus;
};

async function tenantsForUsers(userIds: string[]): Promise<Map<string, string[]>> {
  if (userIds.length === 0) return new Map();
  const memberships = await prisma.tenantMember.findMany({
    where: { userId: { in: userIds } },
    select: { userId: true, tenantId: true },
  });
  const map = new Map<string, string[]>();
  for (const m of memberships) {
    const cur = map.get(m.userId) ?? [];
    cur.push(m.tenantId);
    map.set(m.userId, cur);
  }
  return map;
}

function rowsToDto(
  rows: {
    id: string;
    tenantId: string;
    userId: string;
    roles: TenantScopedRole[];
    user: { id: string; email: string; name: string | null; status: UserStatus };
  }[],
  allTenantsPerUser: Map<string, string[]>,
): TenantMemberAdminDto[] {
  return rows.map((r) => ({
    membershipId: r.id,
    tenantId: r.tenantId,
    userId: r.user.id,
    email: r.user.email,
    name: r.user.name,
    roles: r.roles,
    tenantIds: allTenantsPerUser.get(r.userId) ?? [],
    status: r.user.status,
  }));
}

export async function assertGlobalAdmin(userId: string): Promise<void> {
  const u = await prisma.user.findUnique({ where: { id: userId }, select: { globalRole: true } });
  if (!u || u.globalRole !== 'ADMIN') {
    throw Errors.forbidden('Platform administrator required');
  }
}

/** Members of a tenant — platform ADMIN only (route-enforced); includes each user's other tenants. */
export async function listMembersForTenant(tenantId: string): Promise<TenantMemberAdminDto[]> {
  const rows = await prisma.tenantMember.findMany({
    where: { tenantId },
    include: { user: { select: { id: true, email: true, name: true, status: true } } },
    orderBy: { createdAt: 'asc' },
  });

  const userIds = rows.map((r) => r.userId);
  const overlap = await tenantsForUsers(userIds);
  return rowsToDto(rows, overlap);
}

export async function listTenantsForUser(userId: string, globalRole: GlobalRole) {
  if (globalRole === 'ADMIN') {
    return prisma.tenant.findMany({
      orderBy: { name: 'asc' },
    });
  }
  return prisma.tenant.findMany({
    where: { members: { some: { userId, roles: { isEmpty: false } } } },
    orderBy: { name: 'asc' },
  });
}

export async function createTenant(actorId: string, input: { name: string; slug: string }) {
  await assertGlobalAdmin(actorId);
  const existing = await prisma.tenant.findUnique({ where: { slug: input.slug } });
  if (existing) {
    throw Errors.conflict('Tenant slug already exists');
  }
  return prisma.tenant.create({
    data: { name: input.name, slug: input.slug },
  });
}

export async function addMember(
  tenantId: string,
  input: { email: string; roles: TenantScopedRole[] },
) {
  if (input.roles.length === 0) {
    throw Errors.validation('At least one tenant role (CREATOR or APPROVER) is required.');
  }

  const user = await prisma.user.findUnique({ where: { email: input.email.toLowerCase().trim() } });
  if (!user) {
    throw Errors.notFound('User');
  }
  if (user.status !== 'ACTIVE') {
    throw Errors.validation('Only ACTIVE users can be assigned to a tenant.');
  }

  try {
    await prisma.tenantMember.create({
      data: { tenantId, userId: user.id, roles: input.roles },
    });
  } catch (e) {
    if (isUniqueViolation(e)) {
      throw Errors.conflict('User is already a member of this tenant');
    }
    throw e;
  }

  const mine = await prisma.tenantMember.findFirst({
    where: { tenantId, userId: user.id },
    include: { user: { select: { id: true, email: true, name: true, status: true } } },
  });
  if (!mine) throw Errors.internal('Failed to resolve new membership');

  const overlap = await tenantsForUsers([user.id]);
  return rowsToDto(
    [{ id: mine.id, tenantId: mine.tenantId, userId: mine.userId, roles: mine.roles, user: mine.user }],
    overlap,
  )[0]!;
}

export async function updateMemberRoles(
  tenantId: string,
  targetUserId: string,
  roles: TenantScopedRole[],
) {
  if (roles.length === 0) {
    throw Errors.validation('At least one tenant role (CREATOR or APPROVER) is required.');
  }

  const row = await prisma.tenantMember.findUnique({
    where: { tenantId_userId: { tenantId, userId: targetUserId } },
    include: { user: { select: { id: true, email: true, name: true, status: true } } },
  });
  if (!row) {
    throw Errors.notFound('Member');
  }

  const updated = await prisma.tenantMember.update({
    where: { tenantId_userId: { tenantId, userId: targetUserId } },
    data: { roles },
    include: { user: { select: { id: true, email: true, name: true, status: true } } },
  });

  const overlap = await tenantsForUsers([targetUserId]);
  return rowsToDto(
    [
      {
        id: updated.id,
        tenantId: updated.tenantId,
        userId: updated.userId,
        roles: updated.roles,
        user: updated.user,
      },
    ],
    overlap,
  )[0]!;
}

export async function removeMember(tenantId: string, targetUserId: string) {
  const row = await prisma.tenantMember.findUnique({
    where: { tenantId_userId: { tenantId, userId: targetUserId } },
  });
  if (!row) {
    throw Errors.notFound('Member');
  }

  await prisma.tenantMember.delete({
    where: { tenantId_userId: { tenantId, userId: targetUserId } },
  });
}

function isUniqueViolation(e: unknown): boolean {
  return typeof e === 'object' && e !== null && 'code' in e && (e as { code: string }).code === 'P2002';
}
