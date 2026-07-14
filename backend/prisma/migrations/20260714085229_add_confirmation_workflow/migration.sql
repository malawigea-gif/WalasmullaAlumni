-- AlterTable
ALTER TABLE "donations" ADD COLUMN     "confirmed_at" TIMESTAMP(3),
ADD COLUMN     "confirmed_by" TEXT;

-- AlterTable
ALTER TABLE "fee_payments" ADD COLUMN     "confirmed_at" TIMESTAMP(3),
ADD COLUMN     "confirmed_by" TEXT;

-- AlterTable
ALTER TABLE "labour_contributions" ADD COLUMN     "confirmed_at" TIMESTAMP(3),
ADD COLUMN     "confirmed_by" TEXT;

-- AlterTable
ALTER TABLE "meeting_attendance" ADD COLUMN     "confirmed_at" TIMESTAMP(3),
ADD COLUMN     "confirmed_by" TEXT;

-- AddForeignKey
ALTER TABLE "fee_payments" ADD CONSTRAINT "fee_payments_confirmed_by_fkey" FOREIGN KEY ("confirmed_by") REFERENCES "members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "donations" ADD CONSTRAINT "donations_confirmed_by_fkey" FOREIGN KEY ("confirmed_by") REFERENCES "members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "labour_contributions" ADD CONSTRAINT "labour_contributions_confirmed_by_fkey" FOREIGN KEY ("confirmed_by") REFERENCES "members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meeting_attendance" ADD CONSTRAINT "meeting_attendance_confirmed_by_fkey" FOREIGN KEY ("confirmed_by") REFERENCES "members"("id") ON DELETE SET NULL ON UPDATE CASCADE;
