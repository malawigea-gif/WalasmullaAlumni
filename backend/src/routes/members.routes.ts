import { Router } from "express";
import QRCode from "qrcode";
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { authenticate, requireElevatedAccess, requireSelfOrElevated } from "../middleware/auth";
import { validateBody } from "../middleware/validate";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/ApiError";
import { toPublicMember } from "../utils/serialize";
import {
  childSchema,
  donationSchema,
  feePaymentSchema,
  labourContributionSchema,
  profileUpdateSchema,
} from "../schemas/profile.schema";

const router = Router();

router.use(authenticate);

router.get(
  "/",
  requireElevatedAccess,
  asyncHandler(async (req, res) => {
    const { q, district, gramaNiladhariDivision, page = "1", pageSize = "20" } = req.query as Record<string, string>;

    const pageNum = Math.max(1, Number(page) || 1);
    const pageSizeNum = Math.min(100, Math.max(1, Number(pageSize) || 20));

    const where: Prisma.MemberWhereInput = {
      deletedAt: null,
      AND: [
        q
          ? {
              OR: [
                { email: { contains: q, mode: "insensitive" } },
                { profile: { fullName: { contains: q, mode: "insensitive" } } },
                { profile: { nameWithInitials: { contains: q, mode: "insensitive" } } },
              ],
            }
          : {},
        district ? { profile: { district: { equals: district, mode: "insensitive" } } } : {},
        gramaNiladhariDivision
          ? { profile: { gramaNiladhariDivision: { equals: gramaNiladhariDivision, mode: "insensitive" } } }
          : {},
      ],
    };

    const [members, total] = await Promise.all([
      prisma.member.findMany({
        where,
        include: { profile: true },
        skip: (pageNum - 1) * pageSizeNum,
        take: pageSizeNum,
        orderBy: { createdAt: "asc" },
      }),
      prisma.member.count({ where }),
    ]);

    res.json({
      members: members.map(toPublicMember),
      pagination: { page: pageNum, pageSize: pageSizeNum, total, totalPages: Math.ceil(total / pageSizeNum) },
    });
  })
);

router.get(
  "/:id",
  requireSelfOrElevated(),
  asyncHandler(async (req, res) => {
    const member = await prisma.member.findUnique({
      where: { id: req.params.id },
      include: { profile: true, children: true },
    });
    if (!member) throw new ApiError(404, "Member not found");
    res.json(toPublicMember(member));
  })
);

router.put(
  "/:id",
  requireSelfOrElevated(),
  validateBody(profileUpdateSchema),
  asyncHandler(async (req, res) => {
    const { phone, ...profileFields } = req.body;

    const member = await prisma.member.update({
      where: { id: req.params.id },
      data: {
        phone: phone ?? undefined,
        profile: {
          upsert: {
            create: { fullName: "", nameWithInitials: "", ...profileFields },
            update: profileFields,
          },
        },
      },
      include: { profile: true, children: true },
    });
    res.json(toPublicMember(member));
  })
);

router.post(
  "/:id/children",
  requireSelfOrElevated(),
  validateBody(childSchema),
  asyncHandler(async (req, res) => {
    const child = await prisma.child.create({
      data: { memberId: req.params.id, name: req.body.name, dateOfBirth: req.body.dateOfBirth ?? null },
    });
    res.status(201).json(child);
  })
);

router.delete(
  "/:id/children/:childId",
  requireSelfOrElevated(),
  asyncHandler(async (req, res) => {
    const child = await prisma.child.findUnique({ where: { id: req.params.childId } });
    if (!child || child.memberId !== req.params.id) throw new ApiError(404, "Child not found");
    await prisma.child.delete({ where: { id: req.params.childId } });
    res.status(204).send();
  })
);

router.get(
  "/:id/fee-payments",
  requireSelfOrElevated(),
  asyncHandler(async (req, res) => {
    const payments = await prisma.feePayment.findMany({
      where: { memberId: req.params.id },
      orderBy: { paidDate: "desc" },
    });
    res.json(payments);
  })
);

router.post(
  "/:id/fee-payments",
  requireSelfOrElevated(),
  validateBody(feePaymentSchema),
  asyncHandler(async (req, res) => {
    const payment = await prisma.feePayment.create({
      data: {
        memberId: req.params.id,
        amount: req.body.amount,
        year: req.body.year,
        paidDate: req.body.paidDate ?? new Date(),
        recordedBy: req.user!.id,
      },
    });
    res.status(201).json(payment);
  })
);

router.patch(
  "/:id/fee-payments/:paymentId/confirm",
  requireElevatedAccess,
  asyncHandler(async (req, res) => {
    const payment = await prisma.feePayment.findUnique({ where: { id: req.params.paymentId } });
    if (!payment || payment.memberId !== req.params.id) throw new ApiError(404, "Fee payment not found");
    if (payment.confirmedAt) throw new ApiError(409, "This payment has already been confirmed");

    const updated = await prisma.feePayment.update({
      where: { id: payment.id },
      data: { confirmedBy: req.user!.id, confirmedAt: new Date() },
    });
    res.json(updated);
  })
);

router.get(
  "/:id/donations",
  requireSelfOrElevated(),
  asyncHandler(async (req, res) => {
    const donations = await prisma.donation.findMany({
      where: { memberId: req.params.id },
      orderBy: { donatedDate: "desc" },
    });
    res.json(donations);
  })
);

router.post(
  "/:id/donations",
  requireSelfOrElevated(),
  validateBody(donationSchema),
  asyncHandler(async (req, res) => {
    const donation = await prisma.donation.create({
      data: {
        memberId: req.params.id,
        description: req.body.description,
        amount: req.body.amount ?? null,
        donatedDate: req.body.donatedDate ?? new Date(),
        recordedBy: req.user!.id,
      },
    });
    res.status(201).json(donation);
  })
);

router.patch(
  "/:id/donations/:donationId/confirm",
  requireElevatedAccess,
  asyncHandler(async (req, res) => {
    const donation = await prisma.donation.findUnique({ where: { id: req.params.donationId } });
    if (!donation || donation.memberId !== req.params.id) throw new ApiError(404, "Donation not found");
    if (donation.confirmedAt) throw new ApiError(409, "This donation has already been confirmed");

    const updated = await prisma.donation.update({
      where: { id: donation.id },
      data: { confirmedBy: req.user!.id, confirmedAt: new Date() },
    });
    res.json(updated);
  })
);

router.get(
  "/:id/labour-contributions",
  requireSelfOrElevated(),
  asyncHandler(async (req, res) => {
    const contributions = await prisma.labourContribution.findMany({
      where: { memberId: req.params.id },
      orderBy: { date: "desc" },
    });
    res.json(contributions);
  })
);

router.post(
  "/:id/labour-contributions",
  requireSelfOrElevated(),
  validateBody(labourContributionSchema),
  asyncHandler(async (req, res) => {
    const contribution = await prisma.labourContribution.create({
      data: {
        memberId: req.params.id,
        description: req.body.description,
        date: req.body.date ?? new Date(),
        hours: req.body.hours ?? null,
        recordedBy: req.user!.id,
      },
    });
    res.status(201).json(contribution);
  })
);

router.patch(
  "/:id/labour-contributions/:contributionId/confirm",
  requireElevatedAccess,
  asyncHandler(async (req, res) => {
    const contribution = await prisma.labourContribution.findUnique({ where: { id: req.params.contributionId } });
    if (!contribution || contribution.memberId !== req.params.id) throw new ApiError(404, "Labour contribution not found");
    if (contribution.confirmedAt) throw new ApiError(409, "This labour contribution has already been confirmed");

    const updated = await prisma.labourContribution.update({
      where: { id: contribution.id },
      data: { confirmedBy: req.user!.id, confirmedAt: new Date() },
    });
    res.json(updated);
  })
);

router.get(
  "/:id/attendance",
  requireSelfOrElevated(),
  asyncHandler(async (req, res) => {
    const attendance = await prisma.meetingAttendance.findMany({
      where: { memberId: req.params.id },
      include: { meeting: true },
      orderBy: { scannedAt: "desc" },
    });
    res.json(attendance);
  })
);

router.patch(
  "/:id/attendance/:attendanceId/confirm",
  requireElevatedAccess,
  asyncHandler(async (req, res) => {
    const attendance = await prisma.meetingAttendance.findUnique({ where: { id: req.params.attendanceId } });
    if (!attendance || attendance.memberId !== req.params.id) throw new ApiError(404, "Attendance record not found");
    if (attendance.confirmedAt) throw new ApiError(409, "This attendance record has already been confirmed");

    const updated = await prisma.meetingAttendance.update({
      where: { id: attendance.id },
      data: { confirmedBy: req.user!.id, confirmedAt: new Date() },
      include: { meeting: true },
    });
    res.json(updated);
  })
);

router.get(
  "/:id/qr-code",
  requireSelfOrElevated(),
  asyncHandler(async (req, res) => {
    const qr = await prisma.qRCode.findUnique({ where: { memberId: req.params.id } });
    if (!qr) throw new ApiError(404, "QR code not found for this member");
    const dataUrl = await QRCode.toDataURL(qr.qrToken);
    res.json({ qrToken: qr.qrToken, qrImage: dataUrl, generatedAt: qr.generatedAt });
  })
);

export default router;
