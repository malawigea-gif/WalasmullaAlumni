import { Router } from "express";
import { prisma } from "../lib/prisma";
import { authenticate } from "../middleware/auth";
import { validateBody } from "../middleware/validate";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/ApiError";
import { toPublicMember } from "../utils/serialize";
import { profileUpdateSchema } from "../schemas/profile.schema";
import { uploadProfilePhoto } from "../lib/upload";

const router = Router();

router.use(authenticate);

router.get(
  "/me",
  asyncHandler(async (req, res) => {
    const member = await prisma.member.findUnique({
      where: { id: req.user!.id },
      include: { profile: true, children: true },
    });
    if (!member) throw new ApiError(404, "Member not found");

    const activeDelegation = await prisma.privilegeDelegation.findFirst({
      where: { memberId: req.user!.id, isActive: true },
      select: { id: true, grantedAt: true, grantedBy: true },
    });

    res.json({ ...toPublicMember(member), activeDelegation: activeDelegation ?? null });
  })
);

router.put(
  "/me",
  validateBody(profileUpdateSchema),
  asyncHandler(async (req, res) => {
    const { phone, ...profileFields } = req.body;

    const member = await prisma.member.update({
      where: { id: req.user!.id },
      data: {
        phone: phone ?? undefined,
        profile: {
          upsert: {
            create: { fullName: "", nameWithInitials: "", ...profileFields },
            update: profileFields,
          },
        },
      },
      include: { profile: true, children: true },
    });
    res.json(toPublicMember(member));
  })
);

router.post(
  "/me/photo",
  uploadProfilePhoto.single("photo"),
  asyncHandler(async (req, res) => {
    if (!req.file) throw new ApiError(400, "No photo uploaded");
    const profilePhotoUrl = `/uploads/${req.file.filename}`;

    await prisma.memberProfile.update({
      where: { memberId: req.user!.id },
      data: { profilePhotoUrl },
    });
    res.json({ profilePhotoUrl });
  })
);

export default router;
