/**
 * Announcements / push notification routes.
 * GET    /api/admin/announcements      — list active announcements
 * POST   /api/admin/announcements      — create an announcement
 * DELETE /api/admin/announcements/:id  — remove an announcement
 */
import { Router } from "express";
import { adminAuth } from "../../middlewares/admin-auth.js";
import { rtdbGet, rtdbSet, rtdbRemove, rtdbPush } from "../../lib/firebase-admin.js";

const router = Router();

router.get("/", adminAuth, async (_req, res) => {
  const raw = await rtdbGet("adminConfig/announcements");
  const list = Object.entries((raw ?? {}) as Record<string, unknown>).map(
    ([id, v]) => ({ id, ...(v as object) })
  ).sort((a, b) => ((b as Record<string, number>)["at"] ?? 0) - ((a as Record<string, number>)["at"] ?? 0));
  res.json({ announcements: list });
});

router.post("/", adminAuth, async (req, res) => {
  const { title, message, type, expiresAt } = req.body as {
    title: string; message: string;
    type?: "info" | "warning" | "event" | "maintenance";
    expiresAt?: number;
  };
  if (!title || !message) {
    res.status(400).json({ error: "title and message are required" });
    return;
  }

  const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const data = {
    title, message,
    type: type ?? "info",
    expiresAt: expiresAt ?? null,
    createdBy: req.admin!.username,
    at: Date.now(),
    active: true,
  };
  await rtdbSet(`adminConfig/announcements/${id}`, data);
  await rtdbPush("adminLogs", {
    type: "create_announcement",
    admin: req.admin!.username,
    target: id,
    details: title,
    at: Date.now(),
  });
  res.json({ ok: true, id, ...data });
});

router.delete("/:id", adminAuth, async (req, res) => {
  const { id } = req.params;
  await rtdbRemove(`adminConfig/announcements/${id}`);
  await rtdbPush("adminLogs", {
    type: "delete_announcement",
    admin: req.admin!.username,
    target: id,
    at: Date.now(),
  });
  res.json({ ok: true, id });
});

export default router;
