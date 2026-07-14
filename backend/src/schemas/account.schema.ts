import { z } from "zod";

export const createAccountEntrySchema = z.object({
  type: z.enum(["income", "expense"]),
  description: z.string().min(1),
  amount: z.coerce.number().positive(),
  entryDate: z.coerce.date().optional(),
});
