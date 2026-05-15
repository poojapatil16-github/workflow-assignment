-- CreateEnum
CREATE TYPE "GlobalRole" AS ENUM ('ADMIN', 'USER');

-- AlterTable
ALTER TABLE "User" ADD COLUMN "globalRole" "GlobalRole" NOT NULL DEFAULT 'USER';

-- Promote legacy tenant ADMIN membership holders to platform ADMIN
UPDATE "User" u
SET "globalRole" = 'ADMIN'::"GlobalRole"
FROM (
  SELECT DISTINCT "userId"
  FROM "TenantMember"
  WHERE CAST("role" AS TEXT) = 'ADMIN'
) tm
WHERE u.id = tm."userId";

-- CreateEnum (per-tenant scopes)
CREATE TYPE "TenantScopedRole" AS ENUM ('CREATOR', 'APPROVER');

-- Add replacement column for memberships
ALTER TABLE "TenantMember" ADD COLUMN "roles" "TenantScopedRole"[];
UPDATE "TenantMember"
SET "roles" = CASE
  WHEN CAST("role" AS TEXT) = 'ADMIN' THEN ARRAY['CREATOR'::"TenantScopedRole", 'APPROVER'::"TenantScopedRole"]
  WHEN CAST("role" AS TEXT) = 'USER' THEN ARRAY['CREATOR'::"TenantScopedRole"]
  WHEN CAST("role" AS TEXT) = 'WORKFLOW_CREATOR' THEN ARRAY['CREATOR'::"TenantScopedRole"]
  WHEN CAST("role" AS TEXT) = 'WORKFLOW_APPROVER' THEN ARRAY['APPROVER'::"TenantScopedRole"]
  WHEN CAST("role" AS TEXT) = 'VIEWER' THEN ARRAY[]::"TenantScopedRole"[]
  ELSE ARRAY['CREATOR'::"TenantScopedRole"]
END;
ALTER TABLE "TenantMember" ALTER COLUMN "roles" SET NOT NULL;
ALTER TABLE "TenantMember" ALTER COLUMN "roles" SET DEFAULT ARRAY[]::"TenantScopedRole"[];

-- Drop VIEWER-only rows (no tenant capabilities)
DELETE FROM "TenantMember" WHERE cardinality("roles") = 0;

-- Drop old Role column / enum (no remaining references)
ALTER TABLE "TenantMember" DROP COLUMN "role";
DROP TYPE "Role";
