import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import path from "path";
import { env } from "./config/env";
import { errorHandler } from "./middleware/errorHandler";

import authRoutes from "./routes/auth.routes";
import profileRoutes from "./routes/profile.routes";
import memberRoutes from "./routes/members.routes";
import meetingRoutes from "./routes/meetings.routes";
import messageRoutes from "./routes/messages.routes";
import executiveRoutes from "./routes/executives.routes";
import reportRoutes from "./routes/reports.routes";
import adminRoutes from "./routes/admin.routes";
import accountRoutes from "./routes/accounts.routes";

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: env.corsOrigin, credentials: true }));
  app.use(express.json());
  app.use(morgan("dev"));

  const apiLimiter = rateLimit({ windowMs: 60 * 1000, limit: 120, standardHeaders: true, legacyHeaders: false });
  app.use("/api", apiLimiter);

  app.use("/uploads", express.static(path.join(process.cwd(), env.uploadDir)));

  app.get("/api/health", (_req, res) => res.json({ status: "ok" }));

  app.use("/api/auth", authRoutes);
  app.use("/api/profile", profileRoutes);
  app.use("/api/members", memberRoutes);
  app.use("/api/meetings", meetingRoutes);
  app.use("/api/messages", messageRoutes);
  app.use("/api/executives", executiveRoutes);
  app.use("/api/reports", reportRoutes);
  app.use("/api/admin", adminRoutes);
  app.use("/api/accounts", accountRoutes);

  app.use(errorHandler);

  return app;
}
