import { Router } from "express";
import { prisma } from "../lib/prisma";
import { authenticate, requireElevatedAccess, requireExecutiveOrAdmin } from "../middleware/auth";
import { validateBody } from "../middleware/validate";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/ApiError";
import { createMeetingSchema, scanAttendanceSchema, updateMeetingSchema } from "../schemas/meeting.schema";
import { SAFE_MEMBER_SELECT } from "../utils/serialize";
import { sendBroadcastMessage } from "../services/message.service";

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
  requireExecutiveOrAdmin,
  validateBody(createMeetingSchema),
  asyncHandler(async (req, res) => {
    const meeting = await prisma.meeting.create({ data: req.body });

    try {
      const labourNote = meeting.hasLabourSession
        ? ` This session includes a labour contribution activity (${meeting.labourHours} hours).`
        : "";
      await sendBroadcastMessage({
        senderId: req.user!.id,
        subject: `New meeting: ${meeting.title}`,
        body: `A new meeting "${meeting.title}" has been scheduled for ${new Date(meeting.meetingDate).toLocaleString()}${
          meeting.location ? ` at ${meeting.location}` : ""
        }.${labourNote}`,
      });
    } catch (err) {
      console.error("Failed to send meeting-created broadcast:", err);
    }

    res.status(201).json(meeting);
  })
);

router.patch(
  "/:id",
  requireExecutiveOrAdmin,
  validateBody(updateMeetingSchema),
  asyncHandler(async (req, res) => {
    const existing = await prisma.meeting.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new ApiError(404, "Meeting not found");

    const meeting = await prisma.meeting.update({ where: { id: req.params.id }, data: req.body });
    res.json(meeting);
  })
);

router.delete(
  "/:id",
  requireExecutiveOrAdmin,
  asyncHandler(async (req, res) => {
    const existing = await prisma.meeting.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new ApiError(404, "Meeting not found");

    const attendanceCount = await prisma.meetingAttendance.count({ where: { meetingId: req.params.id } });
    if (attendanceCount > 0) {
      throw new ApiError(409, "Cannot delete a meeting with recorded attendance");
    }

    await prisma.meeting.delete({ where: { id: req.params.id } });
    res.status(204).send();
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

    const attendance = await prisma.$transaction(async (tx) => {
      const created = await tx.meetingAttendance.create({
        data: { meetingId: meeting.id, memberId: qr.memberId, scannedBy: req.user!.id },
        include: { member: { select: SAFE_MEMBER_SELECT } },
      });

      if (meeting.hasLabourSession && meeting.labourHours) {
        await tx.labourContribution.create({
          data: {
            memberId: qr.memberId,
            description: `Meeting attendance: ${meeting.title}`,
            date: meeting.meetingDate,
            hours: meeting.labourHours,
            recordedBy: req.user!.id,
          },
        });
      }

      return created;
    });

    res.status(201).json(attendance);
  })
);

export default router;
