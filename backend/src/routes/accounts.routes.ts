import { Router } from "express";
import { prisma } from "../lib/prisma";
import { authenticate, requireExecutiveOrAdmin, requireTreasurer } from "../middleware/auth";
import { validateBody } from "../middleware/validate";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/ApiError";
import { SAFE_MEMBER_SELECT } from "../utils/serialize";
import { createAccountEntrySchema, createBudgetLineSchema } from "../schemas/account.schema";

const router = Router();

router.use(authenticate);

function computeIsFullyApproved(entry: { budgetLineId: string | null; approvals: unknown[] }) {
  return !!entry.budgetLineId || entry.approvals.length >= 2;
}

router.get(
  "/entries",
  asyncHandler(async (req, res) => {
    const isElevated = req.user!.role === "executive" || req.user!.role === "admin";

    if (isElevated) {
      const entries = await prisma.accountEntry.findMany({
        include: {
          recorder: { select: SAFE_MEMBER_SELECT },
          budgetLine: true,
          approvals: { include: { approver: { select: SAFE_MEMBER_SELECT } } },
        },
        orderBy: { entryDate: "desc" },
      });
      res.json(entries.map((e) => ({ ...e, isFullyApproved: computeIsFullyApproved(e) })));
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
      .filter((e) => computeIsFullyApproved(e))
      .map(({ approvals: _approvals, ...e }) => ({ ...e, isFullyApproved: true }));
    res.json(approvedOnly);
  })
);

router.post(
  "/entries",
  requireTreasurer,
  validateBody(createAccountEntrySchema),
  asyncHandler(async (req, res) => {
    if (req.body.budgetLineId) {
      if (req.body.type !== "expense") {
        throw new ApiError(400, "Only expense entries can be drawn against a budget line");
      }
      const budgetLine = await prisma.budgetLine.findUnique({ where: { id: req.body.budgetLineId } });
      if (!budgetLine) throw new ApiError(404, "Budget line not found");
    }

    const entry = await prisma.accountEntry.create({
      data: {
        type: req.body.type,
        description: req.body.description,
        amount: req.body.amount,
        entryDate: req.body.entryDate ?? new Date(),
        recordedBy: req.user!.id,
        budgetLineId: req.body.budgetLineId ?? null,
      },
      include: { budgetLine: true },
    });
    res.status(201).json({ ...entry, approvals: [], isFullyApproved: computeIsFullyApproved({ ...entry, approvals: [] }) });
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
    if (entry.budgetLineId) {
      throw new ApiError(409, "Budget-linked expenses are treasurer-authorized and do not require approval");
    }
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
    res.json({ ...updated, isFullyApproved: computeIsFullyApproved(updated) });
  })
);

router.get(
  "/budget-lines",
  requireExecutiveOrAdmin,
  asyncHandler(async (_req, res) => {
    const lines = await prisma.budgetLine.findMany({
      include: {
        creator: { select: SAFE_MEMBER_SELECT },
        expenses: true,
      },
      orderBy: [{ year: "desc" }, { createdAt: "desc" }],
    });
    res.json(
      lines.map(({ expenses, ...line }) => {
        const spent = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
        return { ...line, spent: spent.toFixed(2), remaining: (Number(line.plannedAmount) - spent).toFixed(2) };
      })
    );
  })
);

router.post(
  "/budget-lines",
  requireTreasurer,
  validateBody(createBudgetLineSchema),
  asyncHandler(async (req, res) => {
    const line = await prisma.budgetLine.create({
      data: {
        category: req.body.category,
        plannedAmount: req.body.plannedAmount,
        year: req.body.year,
        createdBy: req.user!.id,
      },
    });
    res.status(201).json({ ...line, spent: "0.00", remaining: line.plannedAmount.toString() });
  })
);

export default router;
