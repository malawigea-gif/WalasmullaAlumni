-- CreateEnum
CREATE TYPE "AccountResetStatus" AS ENUM ('pending', 'approved', 'rejected', 'applied');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditAction" ADD VALUE 'membership_no_assigned';
ALTER TYPE "AuditAction" ADD VALUE 'account_reset_requested';
ALTER TYPE "AuditAction" ADD VALUE 'account_reset_approved';
ALTER TYPE "AuditAction" ADD VALUE 'account_reset_rejected';
ALTER TYPE "AuditAction" ADD VALUE 'account_reset_applied';

-- CreateTable
CREATE TABLE "admin_notes" (
    "id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "author_id" TEXT,
    "note" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_notes_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "admin_notes" ADD CONSTRAINT "admin_notes_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_notes" ADD CONSTRAINT "admin_notes_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- DataMigration: carry forward any existing free-text admin note as the first
-- history entry before the old single-value column is dropped below. Author is
-- left null since the original column never recorded who wrote it.
INSERT INTO "admin_notes" ("id", "member_id", "note", "created_at")
SELECT gen_random_uuid()::text, "id", "admin_notes", now()
FROM "members"
WHERE "admin_notes" IS NOT NULL AND length(trim("admin_notes")) > 0;

-- AlterTable
ALTER TABLE "members" DROP COLUMN "admin_notes",
ADD COLUMN     "membership_no" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "members_membership_no_key" ON "members"("membership_no");

-- AlterTable
ALTER TABLE "account_entries" ADD COLUMN     "member_id" TEXT;

-- AddForeignKey
ALTER TABLE "account_entries" ADD CONSTRAINT "account_entries_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "fines" (
    "id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "fine_date" TIMESTAMP(3) NOT NULL,
    "recorded_by" TEXT NOT NULL,
    "confirmed_by" TEXT,
    "confirmed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fines_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "fines" ADD CONSTRAINT "fines_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fines" ADD CONSTRAINT "fines_recorded_by_fkey" FOREIGN KEY ("recorded_by") REFERENCES "members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fines" ADD CONSTRAINT "fines_confirmed_by_fkey" FOREIGN KEY ("confirmed_by") REFERENCES "members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "account_resets" (
    "id" TEXT NOT NULL,
    "requested_by" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "requested_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "AccountResetStatus" NOT NULL DEFAULT 'pending',
    "approved_by" TEXT,
    "approved_at" TIMESTAMP(3),
    "rejection_reason" TEXT,
    "opening_cash_balance" DECIMAL(12,2),
    "opening_bank_balance" DECIMAL(12,2),
    "applied_at" TIMESTAMP(3),

    CONSTRAINT "account_resets_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "account_resets" ADD CONSTRAINT "account_resets_requested_by_fkey" FOREIGN KEY ("requested_by") REFERENCES "members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account_resets" ADD CONSTRAINT "account_resets_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "members"("id") ON DELETE SET NULL ON UPDATE CASCADE;
