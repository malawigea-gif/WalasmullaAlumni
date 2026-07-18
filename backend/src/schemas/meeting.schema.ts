import { z } from "zod";

export const createMeetingSchema = z
  .object({
    title: z.string().min(1),
    meetingDate: z.coerce.date(),
    location: z.string().optional().nullable(),
    type: z.enum(["monthly", "committee"]).optional(),
    hasLabourSession: z.boolean().optional(),
    labourHours: z.coerce.number().positive().optional().nullable(),
  })
  .refine((d) => !d.hasLabourSession || (d.labourHours != null && d.labourHours > 0), {
    message: "labourHours is required and must be positive when hasLabourSession is true",
    path: ["labourHours"],
  });

export const updateMeetingSchema = z
  .object({
    title: z.string().min(1).optional(),
    meetingDate: z.coerce.date().optional(),
    location: z.string().optional().nullable(),
    type: z.enum(["monthly", "committee"]).optional(),
    hasLabourSession: z.boolean().optional(),
    labourHours: z.coerce.number().positive().optional().nullable(),
  })
  .refine((d) => !d.hasLabourSession || (d.labourHours != null && d.labourHours > 0), {
    message: "labourHours is required and must be positive when hasLabourSession is true",
    path: ["labourHours"],
  });

export const scanAttendanceSchema = z.object({
  qrToken: z.string().min(1),
});
