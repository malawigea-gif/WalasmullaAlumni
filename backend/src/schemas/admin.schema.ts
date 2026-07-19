import { z } from "zod";

export const adminActionSchema = z.object({
  reason: z.string().optional(),
});

export const adminNotesSchema = z.object({
  note: z.string().min(1).max(5000),
});

export const setMembershipTypeSchema = z.object({
  membershipType: z.enum(["annual", "honorary", "exemplary", "life"]),
  reason: z.string().optional(),
});
