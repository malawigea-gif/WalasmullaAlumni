-- CreateEnum
-- Wrapped in DO blocks (idempotent) because an earlier diagnostic run of this
-- file already created these three types before failing on a later statement.
DO $$ BEGIN
  CREATE TYPE "PaymentMethod" AS ENUM ('cash', 'bank');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "MembershipType" AS ENUM ('annual', 'honorary', 'exemplary', 'life');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "MembershipStatus" AS ENUM ('active', 'inactive', 'resigned');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- AlterEnum
-- Remaps pre-existing local-dev test data: donation/other_income/bank_interest
-- (removed categories) collapse into the new generic "aid" income category, since
-- there is no production data and no direct equivalent for these in the new set.
BEGIN;
CREATE TYPE "AccountEntryCategory_new" AS ENUM ('membership_fee', 'aid', 'fine', 'petty_cash', 'project', 'bank_payment');
ALTER TABLE "account_entries" ALTER COLUMN "category" TYPE "AccountEntryCategory_new" USING (
  CASE "category"::text
    WHEN 'donation' THEN 'aid'
    WHEN 'other_income' THEN 'aid'
    WHEN 'bank_interest' THEN 'aid'
    ELSE "category"::text
  END::"AccountEntryCategory_new"
);
ALTER TYPE "AccountEntryCategory" RENAME TO "AccountEntryCategory_old";
ALTER TYPE "AccountEntryCategory_new" RENAME TO "AccountEntryCategory";
DROP TYPE "AccountEntryCategory_old";
COMMIT;

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditAction" ADD VALUE 'membership_type_changed';
ALTER TYPE "AuditAction" ADD VALUE 'member_resigned';
ALTER TYPE "AuditAction" ADD VALUE 'member_reactivated';

-- AlterTable
ALTER TABLE "account_entries" ADD COLUMN     "payment_method" "PaymentMethod" NOT NULL DEFAULT 'cash';

-- AlterTable
ALTER TABLE "meetings" ADD COLUMN     "has_labour_session" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "labour_hours" DECIMAL(5,2);

-- AlterTable
ALTER TABLE "members" ADD COLUMN     "admin_notes" TEXT,
ADD COLUMN     "membership_status" "MembershipStatus" NOT NULL DEFAULT 'active',
ADD COLUMN     "membership_status_updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "membership_type" "MembershipType" NOT NULL DEFAULT 'annual';

