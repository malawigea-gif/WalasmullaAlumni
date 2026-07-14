-- CreateEnum
CREATE TYPE "AccountEntryType" AS ENUM ('income', 'expense');

-- CreateTable
CREATE TABLE "account_entries" (
    "id" TEXT NOT NULL,
    "type" "AccountEntryType" NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "entry_date" TIMESTAMP(3) NOT NULL,
    "recorded_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "account_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "account_entry_approvals" (
    "id" TEXT NOT NULL,
    "account_entry_id" TEXT NOT NULL,
    "approver_id" TEXT NOT NULL,
    "approved_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "account_entry_approvals_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "account_entry_approvals_account_entry_id_approver_id_key" ON "account_entry_approvals"("account_entry_id", "approver_id");

-- AddForeignKey
ALTER TABLE "account_entries" ADD CONSTRAINT "account_entries_recorded_by_fkey" FOREIGN KEY ("recorded_by") REFERENCES "members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account_entry_approvals" ADD CONSTRAINT "account_entry_approvals_account_entry_id_fkey" FOREIGN KEY ("account_entry_id") REFERENCES "account_entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account_entry_approvals" ADD CONSTRAINT "account_entry_approvals_approver_id_fkey" FOREIGN KEY ("approver_id") REFERENCES "members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
