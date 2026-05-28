/**
 * Ad configuration routes.
 * GET   /api/admin/ads  — get current ad settings
 * PATCH /api/admin/ads  — update ad settings
 */
import { Router } from "express";
import { adminAuth } from "../../middlewares/admin-auth.js";
import { rtdbGet, rtdbUpdate, rtdbPush } from "../../lib/firebase-admin.js";

const router = Router();

const DEFAULT_ADS_CONFIG = {
  bannerEnabled: true,
  interstitialEnabled: true,
  emergencyOff: false,
  interstitialFrequency: 3,    // every N games
  bannerRefreshSeconds: 60,
  updatedAt: 0,
  updatedBy: "",
};

router.get("/", adminAuth, async (_req, res) => {
  const config = await rtdbGet("adminConfig/ads");
  res.json({ ...(DEFAULT_ADS_CONFIG), ...(config ?? {}) });
});

router.patch("/", adminAuth, async (req, res) => {
  const updates = req.body as Record<string, unknown>;
  // Sanitize — only allow known keys
  const allowed = ["bannerEnabled", "interstitialEnabled", "emergencyOff",
    "interstitialFrequency", "bannerRefreshSeconds"];
  const clean: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in updates) clean[key] = updates[key];
  }
  clean["updatedAt"] = Date.now();
  clean["updatedBy"] = (req.admin?.username) ?? "";

  await rtdbUpdate("adminConfig/ads", clean);
  await rtdbPush("adminLogs", {
    type: "update_ads",
    admin: req.admin!.username,
    details: JSON.stringify(clean),
    at: Date.now(),
  });
  res.json({ ok: true, ...clean });
});

export default router;
