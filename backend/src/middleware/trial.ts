import type { Request, Response, NextFunction } from "express";

/**
 * Fallback trial start date, used only if TRIAL_START_DATE is not set in the
 * environment. Kept as a fixed value (not `new Date()`) so an accidental or
 * deliberate removal of the env var doesn't silently disable the trial.
 */
const DEFAULT_TRIAL_START_DATE = "2026-07-22";
const DEFAULT_TRIAL_LENGTH_DAYS = 90;

function getTrialExpiry(): Date {
  const startDateStr = process.env.TRIAL_START_DATE ?? DEFAULT_TRIAL_START_DATE;
  const lengthDays = Number(process.env.TRIAL_LENGTH_DAYS ?? DEFAULT_TRIAL_LENGTH_DAYS);
  const startDate = new Date(`${startDateStr}T00:00:00Z`);
  return new Date(startDate.getTime() + lengthDays * 24 * 60 * 60 * 1000);
}

export function trialGuard(_req: Request, res: Response, next: NextFunction) {
  if (new Date() >= getTrialExpiry()) {
    res.status(403).json({
      error: "Trial period has expired. Please contact the developer to continue using this system.",
      trialExpired: true,
    });
    return;
  }
  next();
}
