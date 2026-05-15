/*
  Warnings:

  - You are about to drop the column `endsAt` on the `Delegation` table. All the data in the column will be lost.
  - You are about to drop the column `startsAt` on the `Delegation` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "ItemStatus" AS ENUM ('ACTIVE', 'APPROVED', 'REJECTED', 'COMPLETED');

-- DropIndex
DROP INDEX "Delegation_startsAt_endsAt_idx";

-- AlterTable
ALTER TABLE "Delegation" DROP COLUMN "endsAt",
DROP COLUMN "startsAt",
ADD COLUMN     "active" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "Item" ADD COLUMN     "status" "ItemStatus" NOT NULL DEFAULT 'ACTIVE';

-- AlterTable
ALTER TABLE "WorkflowState" ADD COLUMN     "isTerminal" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "Item_status_idx" ON "Item"("status");
