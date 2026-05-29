/**
 * Admin API router — mounts all admin sub-routes under /api/admin/*
 */
import { Router } from "express";
import authRouter from "./auth.js";
import dashboardRouter from "./dashboard.js";
import playersRouter from "./players.js";
import matchesRouter from "./matches.js";
import rewardsRouter from "./rewards.js";
import adsRouter from "./ads.js";
import announcementsRouter from "./announcements.js";
import logsRouter from "./logs.js";

const router = Router();

router.use("/auth",          authRouter);
router.use("/dashboard",     dashboardRouter);
router.use("/players",       playersRouter);
router.use("/matches",       matchesRouter);
router.use("/rewards",       rewardsRouter);
router.use("/ads",           adsRouter);
router.use("/announcements", announcementsRouter);
router.use("/logs",          logsRouter);

export default router;
