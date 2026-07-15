import { Router } from "express";
import { prisma } from "../lib/prisma";
import { authenticate, requireExecutiveOrAdmin } from "../middleware/auth";
import { asyncHandler } from "../utils/asyncHandler";

const router = Router();

router.use(authenticate, requireExecutiveOrAdmin);

router.get(
  "/summary",
  asyncHandler(async (_req, res) => {
    const [totalMembers, feeAgg, donationAgg, labourAgg, meetings, attendanceCount] = await Promise.all([
      prisma.member.count(),
      prisma.feePayment.groupBy({ by: ["year"], _sum: { amount: true }, orderBy: { year: "asc" } }),
      prisma.donation.aggregate({ _sum: { amount: true }, _count: true }),
      prisma.labourContribution.aggregate({ _sum: { hours: true }, _count: true }),
      prisma.meeting.findMany({ include: { _count: { select: { attendances: true } } } }),
      prisma.meetingAttendance.count(),
    ]);

    const meetingAttendance = meetings.map((m) => ({
      meetingId: m.id,
      title: m.title,
      meetingDate: m.meetingDate,
      attendeeCount: m._count.attendances,
      attendancePercentage: totalMembers > 0 ? Math.round((m._count.attendances / totalMembers) * 1000) / 10 : 0,
    }));

    res.json({
      totalMembers,
      feeCollectionByYear: feeAgg.map((f) => ({ year: f.year, total: f._sum.amount ?? 0 })),
      donations: { total: donationAgg._sum.amount ?? 0, count: donationAgg._count },
      labourContributions: { totalHours: labourAgg._sum.hours ?? 0, count: labourAgg._count },
      meetingAttendance,
      overallAttendanceRecords: attendanceCount,
    });
  })
);

export default router;
