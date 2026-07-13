import { NextFunction, Request, Response } from "express";
import { ApiError } from "../utils/ApiError";
import { verifyAccessToken } from "../utils/jwt";
import { ExecutivePositionType, Role } from "@prisma/client";

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

export function authenticate(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    throw new ApiError(401, "Authentication required");
  }
  const token = header.slice("Bearer ".length);
  try {
    const payload = verifyAccessToken(token);
    req.user = { id: payload.sub, role: payload.role, executivePosition: payload.executivePosition };
    next();
  } catch {
    throw new ApiError(401, "Invalid or expired token");
  }
}

export function requireExecutive(req: Request, _res: Response, next: NextFunction) {
  if (req.user?.role !== "executive") {
    throw new ApiError(403, "Executive access required");
  }
  next();
}

/** Allows access to executives acting on their own record, or executives acting on any member. Blocks members acting on others. */
export function requireSelfOrExecutive(paramName = "id") {
  return (req: Request, _res: Response, next: NextFunction) => {
    const targetId = req.params[paramName];
    if (req.user?.role === "executive" || req.user?.id === targetId) {
      return next();
    }
    throw new ApiError(403, "You do not have permission to access this resource");
  };
}
