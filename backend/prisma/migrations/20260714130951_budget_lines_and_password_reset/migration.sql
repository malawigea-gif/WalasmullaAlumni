-- AlterEnum
ALTER TYPE "AuditAction" ADD VALUE 'password_reset';

-- AlterTable
ALTER TABLE "account_entries" ADD COLUMN     "budget_line_id" TEXT;

-- CreateTable
CREATE TABLE "budget_lines" (
    "id" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "planned_amount" DECIMAL(12,2) NOT NULL,
    "year" INTEGER NOT NULL,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "budget_lines_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "account_entries" ADD CONSTRAINT "account_entries_budget_line_id_fkey" FOREIGN KEY ("budget_line_id") REFERENCES "budget_lines"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "budget_lines" ADD CONSTRAINT "budget_lines_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
