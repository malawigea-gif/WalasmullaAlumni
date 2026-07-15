import { z } from "zod";

export const createReportDocumentSchema = z.object({
  title: z.string().min(1),
  reportDate: z.coerce.date(),
});
