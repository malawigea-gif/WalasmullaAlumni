import { z } from "zod";

export const adminActionSchema = z.object({
  reason: z.string().optional(),
});

export const adminNotesSchema = z.object({
  adminNotes: z.string().max(5000).optional().nullable(),
});

export const setMembershipTypeSchema = z.object({
  membershipType: z.enum(["annual", "honorary", "exemplary", "life"]),
  reason: z.string().optional(),
});
