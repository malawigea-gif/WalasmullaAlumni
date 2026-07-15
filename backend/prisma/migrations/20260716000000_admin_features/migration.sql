-- CreateEnum
CREATE TYPE "AccountEntryCategory" AS ENUM ('membership_fee', 'donation', 'other_income', 'bank_interest');

-- CreateEnum
CREATE TYPE "MeetingType" AS ENUM ('monthly', 'committee');

-- AlterTable
ALTER TABLE "account_entries" ADD COLUMN     "category" "AccountEntryCategory";

-- AlterTable
ALTER TABLE "meetings" ADD COLUMN     "type" "MeetingType" NOT NULL DEFAULT 'monthly';

-- CreateTable
CREATE TABLE "report_documents" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "file_url" TEXT NOT NULL,
    "report_date" TIMESTAMP(3) NOT NULL,
    "uploaded_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "report_documents_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "report_documents" ADD CONSTRAINT "report_documents_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

