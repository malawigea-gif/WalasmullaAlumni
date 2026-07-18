import { Router } from "express";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { authenticate, requireAdmin } from "../middleware/auth";
import { validateBody } from "../middleware/validate";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/ApiError";
import { toPublicMember, SAFE_MEMBER_SELECT } from "../utils/serialize";
import { adminActionSchema, adminNotesSchema, setMembershipTypeSchema } from "../schemas/admin.schema";
import { recomputeInactivity } from "../services/inactivity.service";

const router = Router();

router.use(authenticate, requireAdmin);

router.get(
  "/members",
  asyncHandler(async (req, res) => {
    const { q, status, page = "1", pageSize = "20" } = req.query as Record<string, string>;

    const pageNum = Math.max(1, Number(page) || 1);
    const pageSizeNum = Math.min(100, Math.max(1, Number(pageSize) || 20));

    const where: Prisma.MemberWhereInput = {
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
        status ? { status: status as "active" | "blocked" } : {},
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

router.post(
  "/members/:id/block",
  validateBody(adminActionSchema),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    if (id === req.user!.id) throw new ApiError(400, "You cannot block your own account");

    const target = await prisma.member.findUnique({ where: { id } });
    if (!target || target.deletedAt) throw new ApiError(404, "Member not found");
    if (target.status === "blocked") throw new ApiError(409, "Member is already blocked");

    const [member] = await prisma.$transaction([
      prisma.member.update({ where: { id }, data: { status: "blocked" } }),
      prisma.auditLog.create({
        data: { actorId: req.user!.id, targetId: id, action: "member_blocked", reason: req.body.reason ?? null },
      }),
    ]);

    res.json(toPublicMember(member));
  })
);

router.post(
  "/members/:id/unblock",
  validateBody(adminActionSchema),
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    const target = await prisma.member.findUnique({ where: { id } });
    if (!target || target.deletedAt) throw new ApiError(404, "Member not found");
    if (target.status === "active") throw new ApiError(409, "Member is not blocked");

    const [member] = await prisma.$transaction([
      prisma.member.update({ where: { id }, data: { status: "active" } }),
      prisma.auditLog.create({
        data: { actorId: req.user!.id, targetId: id, action: "member_unblocked", reason: req.body.reason ?? null },
      }),
    ]);

    res.json(toPublicMember(member));
  })
);

router.delete(
  "/members/:id",
  validateBody(adminActionSchema),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    if (id === req.user!.id) throw new ApiError(400, "You cannot delete your own account");

    const target = await prisma.member.findUnique({ where: { id } });
    if (!target) throw new ApiError(404, "Member not found");
    if (target.deletedAt) throw new ApiError(409, "Member is already deleted");

    await prisma.$transaction([
      prisma.member.update({ where: { id }, data: { deletedAt: new Date() } }),
      prisma.auditLog.create({
        data: { actorId: req.user!.id, targetId: id, action: "member_deleted", reason: req.body.reason ?? null },
      }),
    ]);

    res.status(204).send();
  })
);

router.post(
  "/members/:id/restore",
  validateBody(adminActionSchema),
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    const target = await prisma.member.findUnique({ where: { id } });
    if (!target || !target.deletedAt) throw new ApiError(404, "No deleted member found with this id");

    const [member] = await prisma.$transaction([
      prisma.member.update({ where: { id }, data: { deletedAt: null } }),
      prisma.auditLog.create({
        data: { actorId: req.user!.id, targetId: id, action: "member_restored", reason: req.body.reason ?? null },
      }),
    ]);

    res.json(toPublicMember(member));
  })
);

router.post(
  "/members/:id/reset-password",
  validateBody(adminActionSchema),
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    const target = await prisma.member.findUnique({ where: { id } });
    if (!target || target.deletedAt) throw new ApiError(404, "Member not found");

    const temporaryPassword = crypto.randomBytes(9).toString("base64").replace(/[+/=]/g, "").slice(0, 12);
    const passwordHash = await bcrypt.hash(temporaryPassword, 10);

    await prisma.$transaction([
      prisma.member.update({ where: { id }, data: { passwordHash } }),
      prisma.auditLog.create({
        data: { actorId: req.user!.id, targetId: id, action: "password_reset", reason: req.body.reason ?? null },
      }),
    ]);

    res.json({ temporaryPassword });
  })
);

router.get(
  "/delegations",
  asyncHandler(async (_req, res) => {
    const delegations = await prisma.privilegeDelegation.findMany({
      include: {
        member: { select: SAFE_MEMBER_SELECT },
        granter: { select: SAFE_MEMBER_SELECT },
      },
      orderBy: { grantedAt: "desc" },
    });
    res.json(delegations);
  })
);

router.post(
  "/members/:id/delegate",
  validateBody(adminActionSchema),
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    const target = await prisma.member.findUnique({ where: { id } });
    if (!target || target.deletedAt) throw new ApiError(404, "Member not found");
    if (target.status === "blocked") throw new ApiError(400, "Cannot delegate access to a blocked member");
    if (target.role !== "member") throw new ApiError(400, "Only member accounts can receive a delegation");

    const existing = await prisma.privilegeDelegation.findFirst({ where: { memberId: id, isActive: true } });
    if (existing) throw new ApiError(409, "This member already has an active delegation");

    const [delegation] = await prisma.$transaction([
      prisma.privilegeDelegation.create({
        data: { memberId: id, grantedBy: req.user!.id },
        include: { member: { select: SAFE_MEMBER_SELECT }, granter: { select: SAFE_MEMBER_SELECT } },
      }),
      prisma.auditLog.create({
        data: { actorId: req.user!.id, targetId: id, action: "delegation_granted", reason: req.body.reason ?? null },
      }),
    ]);

    res.status(201).json(delegation);
  })
);

router.post(
  "/delegations/:delegationId/revoke",
  validateBody(adminActionSchema),
  asyncHandler(async (req, res) => {
    const { delegationId } = req.params;

    const delegation = await prisma.privilegeDelegation.findUnique({ where: { id: delegationId } });
    if (!delegation) throw new ApiError(404, "Delegation not found");
    if (!delegation.isActive) throw new ApiError(409, "This delegation is not active");

    await prisma.$transaction([
      prisma.privilegeDelegation.update({
        where: { id: delegationId },
        data: { isActive: false, revokedAt: new Date() },
      }),
      prisma.auditLog.create({
        data: {
          actorId: req.user!.id,
          targetId: delegation.memberId,
          action: "delegation_revoked",
          reason: req.body.reason ?? null,
        },
      }),
    ]);

    res.status(204).send();
  })
);

router.get(
  "/members/:id/notes",
  asyncHandler(async (req, res) => {
    const member = await prisma.member.findUnique({
      where: { id: req.params.id },
      select: { id: true, adminNotes: true },
    });
    if (!member) throw new ApiError(404, "Member not found");
    res.json({ adminNotes: member.adminNotes });
  })
);

router.put(
  "/members/:id/notes",
  validateBody(adminNotesSchema),
  asyncHandler(async (req, res) => {
    const target = await prisma.member.findUnique({ where: { id: req.params.id } });
    if (!target) throw new ApiError(404, "Member not found");

    const updated = await prisma.member.update({
      where: { id: req.params.id },
      data: { adminNotes: req.body.adminNotes ?? null },
      select: { id: true, adminNotes: true },
    });
    res.json(updated);
  })
);

router.post(
  "/members/:id/membership-type",
  validateBody(setMembershipTypeSchema),
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    const target = await prisma.member.findUnique({ where: { id } });
    if (!target || target.deletedAt) throw new ApiError(404, "Member not found");

    const data: Prisma.MemberUpdateInput = { membershipType: req.body.membershipType };
    if (req.body.membershipType !== "annual" && target.membershipStatus !== "active") {
      data.membershipStatus = "active";
      data.membershipStatusUpdatedAt = new Date();
    }

    const [member] = await prisma.$transaction([
      prisma.member.update({ where: { id }, data }),
      prisma.auditLog.create({
        data: {
          actorId: req.user!.id,
          targetId: id,
          action: "membership_type_changed",
          reason: req.body.reason ?? null,
        },
      }),
    ]);

    res.json(toPublicMember(member));
  })
);

router.post(
  "/members/:id/resign",
  validateBody(adminActionSchema),
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    const target = await prisma.member.findUnique({ where: { id } });
    if (!target || target.deletedAt) throw new ApiError(404, "Member not found");
    if (target.membershipType !== "annual")
      throw new ApiError(400, "Only annual memberships can be marked resigned");
    if (target.membershipStatus === "resigned") throw new ApiError(409, "Member has already resigned");

    const [member] = await prisma.$transaction([
      prisma.member.update({
        where: { id },
        data: { membershipStatus: "resigned", membershipStatusUpdatedAt: new Date() },
      }),
      prisma.auditLog.create({
        data: { actorId: req.user!.id, targetId: id, action: "member_resigned", reason: req.body.reason ?? null },
      }),
    ]);

    res.json(toPublicMember(member));
  })
);

router.post(
  "/members/:id/reactivate",
  validateBody(adminActionSchema),
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    const target = await prisma.member.findUnique({ where: { id } });
    if (!target || target.deletedAt) throw new ApiError(404, "Member not found");
    if (target.membershipType !== "annual")
      throw new ApiError(400, "Only annual memberships can be reactivated");
    if (target.membershipStatus === "active") throw new ApiError(409, "Member is already active");

    const [member] = await prisma.$transaction([
      prisma.member.update({
        where: { id },
        data: { membershipStatus: "active", membershipStatusUpdatedAt: new Date() },
      }),
      prisma.auditLog.create({
        data: { actorId: req.user!.id, targetId: id, action: "member_reactivated", reason: req.body.reason ?? null },
      }),
    ]);

    res.json(toPublicMember(member));
  })
);

router.post(
  "/members/recompute-inactivity",
  asyncHandler(async (_req, res) => {
    const result = await recomputeInactivity();
    res.json(result);
  })
);

router.get(
  "/audit-log",
  asyncHandler(async (_req, res) => {
    const entries = await prisma.auditLog.findMany({
      include: {
        actor: { select: SAFE_MEMBER_SELECT },
        target: { select: SAFE_MEMBER_SELECT },
      },
      orderBy: { createdAt: "desc" },
    });
    res.json(entries);
  })
);

export default router;
