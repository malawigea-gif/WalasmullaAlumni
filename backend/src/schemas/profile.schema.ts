import { z } from "zod";

export const profileUpdateSchema = z.object({
  fullName: z.string().min(1).optional(),
  nameWithInitials: z.string().min(1).optional(),
  dateOfBirth: z.coerce.date().optional().nullable(),
  nicNumber: z.string().optional().nullable(),
  permanentAddress: z.string().optional().nullable(),
  currentAddress: z.string().optional().nullable(),
  gramaNiladhariDivision: z.string().optional().nullable(),
  divisionalSecretariat: z.string().optional().nullable(),
  district: z.string().optional().nullable(),
  schoolPeriodFrom: z.coerce.number().int().optional().nullable(),
  schoolPeriodTo: z.coerce.number().int().optional().nullable(),
  academicAchievements: z.string().optional().nullable(),
  coCurricularAchievements: z.string().optional().nullable(),
  scholarshipExamResult: z.enum(["passed", "failed", "not_applicable"]).optional(),
  leadershipRoles: z.string().optional().nullable(),
  extracurricularGroups: z.string().optional().nullable(),
  olResults: z.any().optional().nullable(),
  alResults: z.any().optional().nullable(),
  higherEducationQualifications: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8, "Password must be at least 8 characters"),
});

export const childSchema = z.object({
  name: z.string().min(1),
  dateOfBirth: z.coerce.date().optional().nullable(),
});

export const feePaymentSchema = z.object({
  amount: z.coerce.number().positive(),
  year: z.coerce.number().int().min(2000).max(2100),
  paidDate: z.coerce.date().optional(),
});

export const donationSchema = z.object({
  description: z.string().min(1),
  amount: z.coerce.number().positive().optional().nullable(),
  donatedDate: z.coerce.date().optional(),
});

export const labourContributionSchema = z.object({
  description: z.string().min(1),
  date: z.coerce.date().optional(),
  hours: z.coerce.number().positive().optional().nullable(),
});
