import { z } from "zod";

export const appointExecutiveSchema = z.object({
  memberId: z.string().min(1),
  reason: z.string().optional(),
});

export const removeExecutiveSchema = z.object({
  reason: z.string().optional(),
});
