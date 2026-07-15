import { z } from "zod";

export const createMeetingSchema = z.object({
  title: z.string().min(1),
  meetingDate: z.coerce.date(),
  location: z.string().optional().nullable(),
  type: z.enum(["monthly", "committee"]).optional(),
});

export const updateMeetingSchema = z.object({
  title: z.string().min(1).optional(),
  meetingDate: z.coerce.date().optional(),
  location: z.string().optional().nullable(),
  type: z.enum(["monthly", "committee"]).optional(),
});

export const scanAttendanceSchema = z.object({
  qrToken: z.string().min(1),
});
