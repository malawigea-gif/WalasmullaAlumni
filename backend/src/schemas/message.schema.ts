import { z } from "zod";

export const sendMessageSchema = z.object({
  subject: z.string().min(1),
  body: z.string().min(1),
  recipientType: z.enum(["individual", "group", "broadcast"]),
  recipientMemberId: z.string().optional(),
  recipientFilter: z
    .object({
      district: z.string().optional(),
      gramaNiladhariDivision: z.string().optional(),
    })
    .optional(),
});
