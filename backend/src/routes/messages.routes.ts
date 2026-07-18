import { Router } from "express";
import { prisma } from "../lib/prisma";
import { authenticate, requireElevatedAccess } from "../middleware/auth";
import { validateBody } from "../middleware/validate";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/ApiError";
import { sendMessageSchema } from "../schemas/message.schema";
import { Prisma } from "@prisma/client";
import { SAFE_MEMBER_SELECT } from "../utils/serialize";
import { sendBroadcastMessage } from "../services/message.service";

const router = Router();

router.use(authenticate);

router.post(
  "/",
  requireElevatedAccess,
  validateBody(sendMessageSchema),
  asyncHandler(async (req, res) => {
    const { subject, body, recipientType, recipientMemberId, recipientFilter } = req.body;

    if (recipientType === "broadcast") {
      const message = await sendBroadcastMessage({ senderId: req.user!.id, subject, body });
      res.status(201).json(message);
      return;
    }

    let recipientIds: string[] = [];

    if (recipientType === "individual") {
      if (!recipientMemberId) throw new ApiError(400, "recipientMemberId is required for individual messages");
      const target = await prisma.member.findUnique({ where: { id: recipientMemberId } });
      if (!target || target.deletedAt) throw new ApiError(404, "Recipient member not found");
      recipientIds = [recipientMemberId];
    } else {
      const where: Prisma.MemberWhereInput = {
        deletedAt: null,
        profile: {
          ...(recipientFilter?.district ? { district: { equals: recipientFilter.district, mode: "insensitive" } } : {}),
          ...(recipientFilter?.gramaNiladhariDivision
            ? { gramaNiladhariDivision: { equals: recipientFilter.gramaNiladhariDivision, mode: "insensitive" } }
            : {}),
        },
      };
      const targets = await prisma.member.findMany({ where, select: { id: true } });
      recipientIds = targets.map((m) => m.id);
      if (recipientIds.length === 0) throw new ApiError(400, "No members match the given group filter");
    }

    const message = await prisma.message.create({
      data: {
        senderId: req.user!.id,
        recipientType,
        recipientFilter: recipientType === "group" ? recipientFilter : Prisma.JsonNull,
        subject,
        body,
        recipients: { createMany: { data: recipientIds.map((memberId) => ({ memberId })) } },
      },
      include: { recipients: true },
    });

    res.status(201).json(message);
  })
);

router.get(
  "/inbox",
  asyncHandler(async (req, res) => {
    const recipientEntries = await prisma.messageRecipient.findMany({
      where: { memberId: req.user!.id },
      include: { message: { include: { sender: { select: SAFE_MEMBER_SELECT } } } },
      orderBy: { message: { sentAt: "desc" } },
    });
    res.json(recipientEntries);
  })
);

router.put(
  "/inbox/:messageRecipientId/read",
  asyncHandler(async (req, res) => {
    const entry = await prisma.messageRecipient.findUnique({ where: { id: req.params.messageRecipientId } });
    if (!entry || entry.memberId !== req.user!.id) throw new ApiError(404, "Message not found");

    const updated = await prisma.messageRecipient.update({
      where: { id: req.params.messageRecipientId },
      data: { readAt: entry.readAt ?? new Date() },
    });
    res.json(updated);
  })
);

export default router;
