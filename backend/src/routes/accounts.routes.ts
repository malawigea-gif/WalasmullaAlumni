import { Router } from "express";
import { prisma } from "../lib/prisma";
import { authenticate, requireAdmin, requireExecutiveOrAdmin, requireTreasurer } from "../middleware/auth";
import { validateBody } from "../middleware/validate";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/ApiError";
import { SAFE_MEMBER_SELECT } from "../utils/serialize";
import { buildBudgetReportPdf } from "../lib/pdf/budgetReport";
import {
  applyAccountResetSchema,
  budgetReportQuerySchema,
  createAccountEntrySchema,
  createAccountResetRequestSchema,
  createBudgetLineSchema,
  rejectAccountResetSchema,
} from "../schemas/account.schema";

const router = Router();

router.use(authenticate);

function computeIsFullyApproved(entry: {
  type: string;
  budgetLineId: string | null;
  receiptIssued: boolean;
  approvals: unknown[];
}) {
  return !!entry.budgetLineId || (entry.type === "income" && entry.receiptIssued) || entry.approvals.length >= 2;
}

router.get(
  "/entries",
  requireExecutiveOrAdmin,
  asyncHandler(async (_req, res) => {
    const entries = await prisma.accountEntry.findMany({
      include: {
        recorder: { select: SAFE_MEMBER_SELECT },
        budgetLine: true,
        approvals: { include: { approver: { select: SAFE_MEMBER_SELECT } } },
      },
      orderBy: { entryDate: "desc" },
    });
    res.json(entries.map((e) => ({ ...e, isFullyApproved: computeIsFullyApproved(e) })));
  })
);

const MEMBER_LINKED_INCOME_CATEGORIES = ["membership_fee", "aid", "fine"] as const;

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

    const entryDate: Date = req.body.entryDate ?? new Date();
    const linkMember =
      req.body.type === "income" &&
      req.body.memberId &&
      (MEMBER_LINKED_INCOME_CATEGORIES as readonly string[]).includes(req.body.category);

    if (req.body.memberId) {
      const member = await prisma.member.findUnique({ where: { id: req.body.memberId } });
      if (!member) throw new ApiError(404, "Member not found");
    }

    const entry = await prisma.$transaction(async (tx) => {
      const created = await tx.accountEntry.create({
        data: {
          type: req.body.type,
          category: req.body.category,
          paymentMethod: req.body.paymentMethod,
          description: req.body.description,
          amount: req.body.amount,
          entryDate,
          recordedBy: req.user!.id,
          budgetLineId: req.body.budgetLineId ?? null,
          receiptIssued: req.body.type === "income" && !!req.body.receiptIssued,
          memberId: req.body.memberId ?? null,
        },
        include: { budgetLine: true },
      });

      if (linkMember) {
        const memberId: string = req.body.memberId;
        if (req.body.category === "membership_fee") {
          await tx.feePayment.create({
            data: {
              memberId,
              amount: req.body.amount,
              year: entryDate.getFullYear(),
              paidDate: entryDate,
              recordedBy: req.user!.id,
            },
          });
        } else if (req.body.category === "aid") {
          await tx.donation.create({
            data: {
              memberId,
              description: req.body.description,
              amount: req.body.amount,
              donatedDate: entryDate,
              recordedBy: req.user!.id,
            },
          });
        } else if (req.body.category === "fine") {
          await tx.fine.create({
            data: {
              memberId,
              description: req.body.description,
              amount: req.body.amount,
              fineDate: entryDate,
              recordedBy: req.user!.id,
            },
          });
        }
      }

      return created;
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
    if (entry.type === "income" && entry.receiptIssued) {
      throw new ApiError(409, "This entry already has a receipt issued and does not require approval");
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

router.get(
  "/reset-status",
  requireExecutiveOrAdmin,
  asyncHandler(async (_req, res) => {
    const [appliedReset, pendingRequest] = await Promise.all([
      prisma.accountReset.findFirst({
        where: { status: "applied" },
        orderBy: { appliedAt: "desc" },
      }),
      prisma.accountReset.findFirst({
        where: { status: { in: ["pending", "approved"] } },
        include: { requester: { select: SAFE_MEMBER_SELECT }, approver: { select: SAFE_MEMBER_SELECT } },
        orderBy: { requestedAt: "desc" },
      }),
    ]);
    res.json({ appliedReset, pendingRequest });
  })
);

router.post(
  "/reset-requests",
  requireTreasurer,
  validateBody(createAccountResetRequestSchema),
  asyncHandler(async (req, res) => {
    const existing = await prisma.accountReset.findFirst({ where: { status: { in: ["pending", "approved"] } } });
    if (existing) throw new ApiError(409, "An account reset request is already in progress");

    const [reset] = await prisma.$transaction([
      prisma.accountReset.create({
        data: { requestedBy: req.user!.id, reason: req.body.reason },
        include: { requester: { select: SAFE_MEMBER_SELECT } },
      }),
      prisma.auditLog.create({
        data: { actorId: req.user!.id, targetId: req.user!.id, action: "account_reset_requested", reason: req.body.reason },
      }),
    ]);
    res.status(201).json(reset);
  })
);

router.post(
  "/reset-requests/:id/approve",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const reset = await prisma.accountReset.findUnique({ where: { id: req.params.id } });
    if (!reset) throw new ApiError(404, "Reset request not found");
    if (reset.status !== "pending") throw new ApiError(409, "This request is not pending approval");

    const [updated] = await prisma.$transaction([
      prisma.accountReset.update({
        where: { id: reset.id },
        data: { status: "approved", approvedBy: req.user!.id, approvedAt: new Date() },
        include: { requester: { select: SAFE_MEMBER_SELECT }, approver: { select: SAFE_MEMBER_SELECT } },
      }),
      prisma.auditLog.create({
        data: { actorId: req.user!.id, targetId: reset.requestedBy, action: "account_reset_approved" },
      }),
    ]);
    res.json(updated);
  })
);

router.post(
  "/reset-requests/:id/reject",
  requireAdmin,
  validateBody(rejectAccountResetSchema),
  asyncHandler(async (req, res) => {
    const reset = await prisma.accountReset.findUnique({ where: { id: req.params.id } });
    if (!reset) throw new ApiError(404, "Reset request not found");
    if (reset.status !== "pending") throw new ApiError(409, "This request is not pending approval");

    const [updated] = await prisma.$transaction([
      prisma.accountReset.update({
        where: { id: reset.id },
        data: { status: "rejected", approvedBy: req.user!.id, approvedAt: new Date(), rejectionReason: req.body.reason },
      }),
      prisma.auditLog.create({
        data: {
          actorId: req.user!.id,
          targetId: reset.requestedBy,
          action: "account_reset_rejected",
          reason: req.body.reason,
        },
      }),
    ]);
    res.json(updated);
  })
);

router.post(
  "/reset-requests/:id/apply",
  requireTreasurer,
  validateBody(applyAccountResetSchema),
  asyncHandler(async (req, res) => {
    const reset = await prisma.accountReset.findUnique({ where: { id: req.params.id } });
    if (!reset) throw new ApiError(404, "Reset request not found");
    if (reset.requestedBy !== req.user!.id) {
      throw new ApiError(403, "Only the treasurer who requested this reset can apply it");
    }
    if (reset.status !== "approved") throw new ApiError(409, "This request has not been approved by an admin yet");

    const [updated] = await prisma.$transaction([
      prisma.accountReset.update({
        where: { id: reset.id },
        data: {
          status: "applied",
          openingCashBalance: req.body.openingCashBalance,
          openingBankBalance: req.body.openingBankBalance,
          appliedAt: new Date(),
        },
      }),
      prisma.auditLog.create({
        data: { actorId: req.user!.id, targetId: req.user!.id, action: "account_reset_applied" },
      }),
    ]);
    res.json(updated);
  })
);

router.get(
  "/budget-report.pdf",
  requireExecutiveOrAdmin,
  asyncHandler(async (req, res) => {
    const parsed = budgetReportQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      throw new ApiError(400, parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "));
    }
    const { from, to } = parsed.data;

    const appliedReset = await prisma.accountReset.findFirst({
      where: { status: "applied" },
      orderBy: { appliedAt: "desc" },
    });
    const resetCutoff = appliedReset?.appliedAt ?? undefined;
    const openingCashBalance = appliedReset ? Number(appliedReset.openingCashBalance ?? 0) : 0;
    const openingBankBalance = appliedReset ? Number(appliedReset.openingBankBalance ?? 0) : 0;

    const entries = await prisma.accountEntry.findMany({
      where: {
        entryDate: { gte: resetCutoff, lte: to },
      },
      include: { approvals: true },
      orderBy: { entryDate: "asc" },
    });

    const approvedEntries = entries.filter((e) => computeIsFullyApproved(e));

    const fromStr = from ? from.toISOString().slice(0, 10) : undefined;
    const toStr = to ? to.toISOString().slice(0, 10) : undefined;

    const doc = buildBudgetReportPdf({
      entries: approvedEntries,
      openingCashBalance,
      openingBankBalance,
      from: fromStr,
      to: toStr,
    });

    const rawName = `budget-report${fromStr ? `-${fromStr}` : ""}${toStr ? `-to-${toStr}` : ""}.pdf`;
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${rawName}"`);
    doc.pipe(res);
    doc.end();
  })
);

export default router;
