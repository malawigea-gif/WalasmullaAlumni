import { NextFunction, Request, Response } from "express";
import { ApiError } from "../utils/ApiError";
import { asyncHandler } from "../utils/asyncHandler";
import { verifyAccessToken } from "../utils/jwt";
import { ExecutivePositionType, Role } from "@prisma/client";
import { prisma } from "../lib/prisma";

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        role: Role;
        executivePosition: ExecutivePositionType | null;
      };
    }
  }
}

/**
 * Re-fetches role/status from the DB on every request (rather than trusting the JWT's
 * role claim) so that blocking/deleting an account or revoking a delegation takes
 * effect immediately, without waiting for the access token to expire.
 */
export const authenticate = asyncHandler(async (req: Request, _res: Response, next: NextFunction) => {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    throw new ApiError(401, "Authentication required");
  }
  const token = header.slice("Bearer ".length);

  let payload;
  try {
    payload = verifyAccessToken(token);
  } catch {
    throw new ApiError(401, "Invalid or expired token");
  }

  const member = await prisma.member.findUnique({
    where: { id: payload.sub },
    select: { id: true, role: true, executivePosition: true, status: true, deletedAt: true },
  });
  if (!member || member.deletedAt || member.status === "blocked") {
    throw new ApiError(401, "This account is no longer active");
  }

  req.user = { id: member.id, role: member.role, executivePosition: member.executivePosition };
  next();
});

export function requireExecutive(req: Request, _res: Response, next: NextFunction) {
  if (req.user?.role !== "executive") {
    throw new ApiError(403, "Executive access required");
  }
  next();
}

export function requireAdmin(req: Request, _res: Response, next: NextFunction) {
  if (req.user?.role !== "admin") {
    throw new ApiError(403, "Admin access required");
  }
  next();
}

async function hasActiveDelegation(memberId: string): Promise<boolean> {
  const delegation = await prisma.privilegeDelegation.findFirst({
    where: { memberId, isActive: true },
    select: { id: true },
  });
  return !!delegation;
}

/** Executives, admins, and members with an active privilege delegation. */
export const requireElevatedAccess = asyncHandler(async (req: Request, _res: Response, next: NextFunction) => {
  if (req.user?.role === "executive" || req.user?.role === "admin") return next();
  if (req.user?.role === "member" && (await hasActiveDelegation(req.user.id))) return next();
  throw new ApiError(403, "Elevated access required");
});

/** Allows an executive/admin/delegated-member acting on any record, or anyone acting on their own record. */
export function requireSelfOrElevated(paramName = "id") {
  return asyncHandler(async (req: Request, _res: Response, next: NextFunction) => {
    const targetId = req.params[paramName];
    if (req.user?.id === targetId) return next();
    if (req.user?.role === "executive" || req.user?.role === "admin") return next();
    if (req.user?.role === "member" && (await hasActiveDelegation(req.user.id))) return next();
    throw new ApiError(403, "You do not have permission to access this resource");
  });
}
