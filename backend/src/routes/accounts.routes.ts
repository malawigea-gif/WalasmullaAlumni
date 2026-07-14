import { Router } from "express";
import { prisma } from "../lib/prisma";
import { authenticate, requireExecutiveOrAdmin, requireTreasurer } from "../middleware/auth";
import { validateBody } from "../middleware/validate";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/ApiError";
import { SAFE_MEMBER_SELECT } from "../utils/serialize";
import { createAccountEntrySchema } from "../schemas/account.schema";

const router = Router();

router.use(authenticate);

router.get(
  "/entries",
  asyncHandler(async (req, res) => {
    const isElevated = req.user!.role === "executive" || req.user!.role === "admin";

    if (isElevated) {
      const entries = await prisma.accountEntry.findMany({
        include: {
          recorder: { select: SAFE_MEMBER_SELECT },
          approvals: { include: { approver: { select: SAFE_MEMBER_SELECT } } },
        },
        orderBy: { entryDate: "desc" },
      });
      res.json(entries.map((e) => ({ ...e, isFullyApproved: e.approvals.length >= 2 })));
      return;
    }

    const now = new Date();
    const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const entries = await prisma.accountEntry.findMany({
      where: { entryDate: { lt: startOfCurrentMonth } },
      include: { approvals: true },
      orderBy: { entryDate: "desc" },
    });
    const approvedOnly = entries
      .filter((e) => e.approvals.length >= 2)
      .map(({ approvals: _approvals, ...e }) => ({ ...e, isFullyApproved: true }));
    res.json(approvedOnly);
  })
);

router.post(
  "/entries",
  requireTreasurer,
  validateBody(createAccountEntrySchema),
  asyncHandler(async (req, res) => {
    const entry = await prisma.accountEntry.create({
      data: {
        type: req.body.type,
        description: req.body.description,
        amount: req.body.amount,
        entryDate: req.body.entryDate ?? new Date(),
        recordedBy: req.user!.id,
      },
    });
    res.status(201).json({ ...entry, approvals: [], isFullyApproved: false });
  })
);

router.post(
  "/entries/:id/approve",
  requireExecutiveOrAdmin,
  asyncHandler(async (req, res) => {
    const entry = await prisma.accountEntry.findUnique({
      where: { id: req.params.id },
      include: { approvals: true },
    });
    if (!entry) throw new ApiError(404, "Account entry not found");
    if (entry.recordedBy === req.user!.id) {
      throw new ApiError(403, "You cannot approve an entry you recorded yourself");
    }
    if (entry.approvals.some((a) => a.approverId === req.user!.id)) {
      throw new ApiError(409, "You have already approved this entry");
    }
    if (entry.approvals.length >= 2) {
      throw new ApiError(409, "This entry is already fully approved");
    }

    await prisma.accountEntryApproval.create({
      data: { accountEntryId: entry.id, approverId: req.user!.id },
    });

    const updated = await prisma.accountEntry.findUniqueOrThrow({
      where: { id: entry.id },
      include: { approvals: { include: { approver: { select: SAFE_MEMBER_SELECT } } } },
    });
    res.json({ ...updated, isFullyApproved: updated.approvals.length >= 2 });
  })
);

export default router;
