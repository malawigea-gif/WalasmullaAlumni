import { z } from "zod";

export const adminActionSchema = z.object({
  reason: z.string().optional(),
});
