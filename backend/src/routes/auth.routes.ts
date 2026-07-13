import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import rateLimit from "express-rate-limit";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/ApiError";
import { validateBody } from "../middleware/validate";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../utils/jwt";
import { toPublicMember } from "../utils/serialize";

const router = Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many login attempts. Please try again later." },
});

const registerSchema = z.object({
  email: z.string().email(),
  phone: z.string().min(9).optional(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  fullName: z.string().min(1),
  nameWithInitials: z.string().min(1),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

function issueTokens(member: { id: string; role: "member" | "executive" | "admin"; executivePosition: any }) {
  const accessToken = signAccessToken({
    sub: member.id,
    role: member.role,
    executivePosition: member.executivePosition,
  });
  const refreshToken = signRefreshToken({ sub: member.id });
  return { accessToken, refreshToken };
}

router.post(
  "/register",
  validateBody(registerSchema),
  asyncHandler(async (req, res) => {
    const { email, phone, password, fullName, nameWithInitials } = req.body;

    const existing = await prisma.member.findUnique({ where: { email } });
    if (existing) throw new ApiError(409, "An account with this email already exists");

    const passwordHash = await bcrypt.hash(password, 10);

    const member = await prisma.member.create({
      data: {
        email,
        phone,
        passwordHash,
        role: "member",
        profile: { create: { fullName, nameWithInitials } },
        qrCode: { create: { qrToken: `qr_${email}_${Date.now()}_${Math.random().toString(36).slice(2)}` } },
      },
    });

    const tokens = issueTokens(member);
    res.status(201).json({ member: toPublicMember(member), ...tokens });
  })
);

router.post(
  "/login",
  loginLimiter,
  validateBody(loginSchema),
  asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    const member = await prisma.member.findUnique({ where: { email } });
    if (!member) throw new ApiError(401, "Invalid email or password");

    const passwordMatches = await bcrypt.compare(password, member.passwordHash);
    if (!passwordMatches) throw new ApiError(401, "Invalid email or password");

    if (member.deletedAt || member.status === "blocked") {
      throw new ApiError(403, "This account has been blocked. Please contact an administrator.");
    }

    const tokens = issueTokens(member);
    res.json({ member: toPublicMember(member), ...tokens });
  })
);

router.post("/logout", (_req, res) => {
  res.status(204).send();
});

router.post(
  "/refresh",
  asyncHandler(async (req, res) => {
    const { refreshToken } = req.body as { refreshToken?: string };
    if (!refreshToken) throw new ApiError(400, "refreshToken is required");

    let payload;
    try {
      payload = verifyRefreshToken(refreshToken);
    } catch {
      throw new ApiError(401, "Invalid or expired refresh token");
    }

    const member = await prisma.member.findUnique({ where: { id: payload.sub } });
    if (!member) throw new ApiError(401, "Invalid refresh token");

    const tokens = issueTokens(member);
    res.json(tokens);
  })
);

router.post(
  "/forgot-password",
  validateBody(forgotPasswordSchema),
  asyncHandler(async (req, res) => {
    // Always respond the same way to avoid leaking which emails are registered.
    const member = await prisma.member.findUnique({ where: { email: req.body.email } });
    if (member) {
      // In production this would send a reset email with a time-limited token.
      console.log(`Password reset requested for ${member.email}`);
    }
    res.json({ message: "If an account with that email exists, a reset link has been sent." });
  })
);

export default router;
