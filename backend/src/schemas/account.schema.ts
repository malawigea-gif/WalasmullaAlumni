import { z } from "zod";

export const INCOME_CATEGORIES = ["membership_fee", "aid", "fine"] as const;
export const EXPENSE_CATEGORIES = ["petty_cash", "project", "bank_payment"] as const;

export const createAccountEntrySchema = z
  .object({
    type: z.enum(["income", "expense"]),
    description: z.string().min(1),
    amount: z.coerce.number().positive(),
    entryDate: z.coerce.date().optional(),
    budgetLineId: z.string().optional(),
    category: z.enum([...INCOME_CATEGORIES, ...EXPENSE_CATEGORIES]),
    paymentMethod: z.enum(["cash", "bank"]),
    receiptIssued: z.boolean().optional(),
  })
  .refine(
    (d) =>
      d.type === "income"
        ? (INCOME_CATEGORIES as readonly string[]).includes(d.category)
        : (EXPENSE_CATEGORIES as readonly string[]).includes(d.category),
    { message: "category does not match entry type", path: ["category"] }
  );

export const createBudgetLineSchema = z.object({
  category: z.string().min(1),
  plannedAmount: z.coerce.number().positive(),
  year: z.coerce.number().int().min(2000).max(2100),
});
