import { z } from "zod";

export const createMeetingSchema = z.object({
  title: z.string().min(1),
  meetingDate: z.coerce.date(),
  location: z.string().optional().nullable(),
});

export const scanAttendanceSchema = z.object({
  qrToken: z.string().min(1),
});
