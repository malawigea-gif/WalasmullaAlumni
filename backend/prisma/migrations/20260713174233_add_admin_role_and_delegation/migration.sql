-- CreateEnum
CREATE TYPE "MemberStatus" AS ENUM ('active', 'blocked');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('member_blocked', 'member_unblocked', 'member_deleted', 'member_restored', 'delegation_granted', 'delegation_revoked');

-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'admin';

-- AlterTable
ALTER TABLE "members" ADD COLUMN     "deleted_at" TIMESTAMP(3),
ADD COLUMN     "status" "MemberStatus" NOT NULL DEFAULT 'active';

-- CreateTable
CREATE TABLE "privilege_delegations" (
    "id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "granted_by" TEXT NOT NULL,
    "granted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revoked_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "privilege_delegations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "actor_id" TEXT NOT NULL,
    "target_id" TEXT NOT NULL,
    "action" "AuditAction" NOT NULL,
    "reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "privilege_delegations" ADD CONSTRAINT "privilege_delegations_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "privilege_delegations" ADD CONSTRAINT "privilege_delegations_granted_by_fkey" FOREIGN KEY ("granted_by") REFERENCES "members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_target_id_fkey" FOREIGN KEY ("target_id") REFERENCES "members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
