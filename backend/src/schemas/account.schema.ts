import { z } from "zod";

export const createAccountEntrySchema = z
  .object({
    type: z.enum(["income", "expense"]),
    description: z.string().min(1),
    amount: z.coerce.number().positive(),
    entryDate: z.coerce.date().optional(),
    budgetLineId: z.string().optional(),
    category: z.enum(["membership_fee", "donation", "other_income", "bank_interest"]).optional(),
  })
  .refine((d) => d.type !== "income" || !!d.category, {
    message: "category is required for income entries",
    path: ["category"],
  });

export const createBudgetLineSchema = z.object({
  category: z.string().min(1),
  plannedAmount: z.coerce.number().positive(),
  year: z.coerce.number().int().min(2000).max(2100),
});
