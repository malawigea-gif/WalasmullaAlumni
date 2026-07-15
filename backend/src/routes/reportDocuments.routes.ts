import { Router } from "express";
import { prisma } from "../lib/prisma";
import { authenticate, requireExecutiveOrAdmin } from "../middleware/auth";
import { validateBody } from "../middleware/validate";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/ApiError";
import { uploadReportDocument } from "../lib/upload";
import { storageProvider } from "../lib/storage";
import { createReportDocumentSchema } from "../schemas/reportDocument.schema";
import { SAFE_MEMBER_SELECT } from "../utils/serialize";

const router = Router();

router.use(authenticate, requireExecutiveOrAdmin);

router.get(
  "/",
  asyncHandler(async (_req, res) => {
    const documents = await prisma.reportDocument.findMany({
      include: { uploader: { select: SAFE_MEMBER_SELECT } },
      orderBy: { reportDate: "desc" },
    });
    res.json(documents);
  })
);

router.post(
  "/",
  uploadReportDocument.single("file"),
  validateBody(createReportDocumentSchema),
  asyncHandler(async (req, res) => {
    if (!req.file) throw new ApiError(400, "No file uploaded");
    const fileUrl = await storageProvider.save({
      buffer: req.file.buffer,
      originalName: req.file.originalname,
      mimetype: req.file.mimetype,
    });

    const document = await prisma.reportDocument.create({
      data: {
        title: req.body.title,
        reportDate: req.body.reportDate,
        fileUrl,
        uploadedBy: req.user!.id,
      },
      include: { uploader: { select: SAFE_MEMBER_SELECT } },
    });
    res.status(201).json(document);
  })
);

router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const existing = await prisma.reportDocument.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new ApiError(404, "Report document not found");

    await prisma.reportDocument.delete({ where: { id: req.params.id } });
    res.status(204).send();
  })
);

export default router;
