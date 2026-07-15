import { Router } from "express";
import { ExecutivePositionType } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { authenticate, requireExecutiveOrAdmin } from "../middleware/auth";
import { validateBody } from "../middleware/validate";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/ApiError";
import { appointExecutiveSchema, removeExecutiveSchema } from "../schemas/executive.schema";
import { SAFE_MEMBER_SELECT } from "../utils/serialize";

const router = Router();

const VALID_POSITIONS = new Set<string>([
  "chairman",
  "vice_chairman",
  "secretary",
  "vice_secretary",
  "treasurer",
]);

function assertValidPosition(position: string): asserts position is ExecutivePositionType {
  if (!VALID_POSITIONS.has(position)) throw new ApiError(400, "Invalid executive position");
}

router.use(authenticate);

router.get(
  "/",
  asyncHandler(async (_req, res) => {
    const positions = await prisma.executivePosition.findMany({
      include: { currentHolder: { select: SAFE_MEMBER_SELECT } },
    });
    res.json(positions);
  })
);

router.get(
  "/history",
  requireExecutiveOrAdmin,
  asyncHandler(async (_req, res) => {
    const history = await prisma.executiveHistory.findMany({
      include: {
        actor: { select: SAFE_MEMBER_SELECT },
        target: { select: SAFE_MEMBER_SELECT },
      },
      orderBy: { createdAt: "desc" },
    });
    res.json(history);
  })
);

router.post(
  "/:position/appoint",
  requireExecutiveOrAdmin,
  validateBody(appointExecutiveSchema),
  asyncHandler(async (req, res) => {
    const { position } = req.params;
    assertValidPosition(position);
    const { memberId, reason } = req.body;

    const target = await prisma.member.findUnique({ where: { id: memberId } });
    if (!target) throw new ApiError(404, "Member not found");

    const existingPosition = await prisma.executivePosition.findUnique({ where: { position } });

    const result = await prisma.$transaction(async (tx) => {
      if (existingPosition?.currentHolderId && existingPosition.currentHolderId !== memberId) {
        await tx.member.update({
          where: { id: existingPosition.currentHolderId },
          data: { role: "member", executivePosition: null },
        });
        await tx.executiveHistory.create({
          data: {
            position,
            actorId: req.user!.id,
            targetId: existingPosition.currentHolderId,
            action: "removed",
            reason: "Replaced by new appointment",
          },
        });
      }

      await tx.member.update({
        where: { id: memberId },
        data: { role: "executive", executivePosition: position },
      });

      const updatedPosition = await tx.executivePosition.upsert({
        where: { position },
        create: { position, currentHolderId: memberId, startDate: new Date() },
        update: { currentHolderId: memberId, startDate: new Date() },
      });

      await tx.executiveHistory.create({
        data: {
          position,
          actorId: req.user!.id,
          targetId: memberId,
          action: "appointed",
          reason: reason ?? null,
        },
      });

      return updatedPosition;
    });

    res.status(201).json(result);
  })
);

router.post(
  "/:position/remove",
  requireExecutiveOrAdmin,
  validateBody(removeExecutiveSchema),
  asyncHandler(async (req, res) => {
    const { position } = req.params;
    assertValidPosition(position);
    const { reason } = req.body;

    const existingPosition = await prisma.executivePosition.findUnique({ where: { position } });
    if (!existingPosition?.currentHolderId) throw new ApiError(404, "This position currently has no holder");

    const holderId = existingPosition.currentHolderId;

    await prisma.$transaction(async (tx) => {
      await tx.member.update({
        where: { id: holderId },
        data: { role: "member", executivePosition: null },
      });

      await tx.executivePosition.update({
        where: { position },
        data: { currentHolderId: null, startDate: null },
      });

      await tx.executiveHistory.create({
        data: {
          position,
          actorId: req.user!.id,
          targetId: holderId,
          action: "removed",
          reason: reason ?? null,
        },
      });
    });

    res.status(204).send();
  })
);

export default router;
