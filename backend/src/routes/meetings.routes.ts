import { Router } from "express";
import { prisma } from "../lib/prisma";
import { authenticate, requireElevatedAccess, requireExecutive } from "../middleware/auth";
import { validateBody } from "../middleware/validate";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/ApiError";
import { createMeetingSchema, scanAttendanceSchema } from "../schemas/meeting.schema";
import { SAFE_MEMBER_SELECT } from "../utils/serialize";

const router = Router();

router.use(authenticate);

router.get(
  "/",
  asyncHandler(async (_req, res) => {
    const meetings = await prisma.meeting.findMany({
      orderBy: { meetingDate: "desc" },
      include: { _count: { select: { attendances: true } } },
    });
    res.json(meetings);
  })
);

router.post(
  "/",
  requireExecutive,
  validateBody(createMeetingSchema),
  asyncHandler(async (req, res) => {
    const meeting = await prisma.meeting.create({ data: req.body });
    res.status(201).json(meeting);
  })
);

router.post(
  "/:id/attendance/scan",
  requireElevatedAccess,
  validateBody(scanAttendanceSchema),
  asyncHandler(async (req, res) => {
    const meeting = await prisma.meeting.findUnique({ where: { id: req.params.id } });
    if (!meeting) throw new ApiError(404, "Meeting not found");

    const qr = await prisma.qRCode.findUnique({ where: { qrToken: req.body.qrToken }, select: { memberId: true, member: { select: SAFE_MEMBER_SELECT } } });
    if (!qr) throw new ApiError(404, "Invalid QR code");

    const existing = await prisma.meetingAttendance.findUnique({
      where: { meetingId_memberId: { meetingId: meeting.id, memberId: qr.memberId } },
    });
    if (existing) throw new ApiError(409, "This member has already been marked present for this meeting");

    const attendance = await prisma.meetingAttendance.create({
      data: { meetingId: meeting.id, memberId: qr.memberId, scannedBy: req.user!.id },
      include: { member: { select: SAFE_MEMBER_SELECT } },
    });

    res.status(201).json(attendance);
  })
);

export default router;
