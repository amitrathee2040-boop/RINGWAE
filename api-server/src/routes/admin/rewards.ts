/**
 * Currency & rewards routes.
 * POST /api/admin/rewards/send    — add coins/gems/gold to a player
 * GET  /api/admin/promo           — list promo codes
 * POST /api/admin/promo           — create a promo code
 * DELETE /api/admin/promo/:code   — delete a promo code
 */
import { Router } from "express";
import { adminAuth } from "../../middlewares/admin-auth.js";
import { rtdbGet, rtdbUpdate, rtdbSet, rtdbRemove, rtdbPush } from "../../lib/firebase-admin.js";

const router = Router();

async function log(action: string, admin: string, target: string, details?: string) {
  await rtdbPush("adminLogs", { type: action, admin, target, details: details ?? "", at: Date.now() });
}

// POST /api/admin/rewards/send
router.post("/send", adminAuth, async (req, res) => {
  const { uid, coins, gems, gold, message } = req.body as {
    uid: string; coins?: number; gems?: number; gold?: number; message?: string;
  };

  if (!uid) { res.status(400).json({ error: "uid is required" }); return; }

  const player = (await rtdbGet(`players/${uid}`)) as Record<string, number> | null;
  if (!player) { res.status(404).json({ error: "Player not found" }); return; }

  const updates: Record<string, number> = {};
  if (coins) updates["coins"] = ((player["coins"] as number) ?? 0) + coins;
  if (gems) updates["gems"] = ((player["gems"] as number) ?? 0) + gems;
  if (gold) updates["gold"] = ((player["gold"] as number) ?? 0) + gold;

  await rtdbUpdate(`players/${uid}`, updates as Record<string, unknown>);

  // Send in-game notification
  await rtdbPush(`notifications/${uid}`, {
    type: "reward",
    message: message ?? `Admin sent you a reward! ${coins ? `+${coins} coins` : ""} ${gems ? `+${gems} gems` : ""} ${gold ? `+${gold} gold` : ""}`.trim(),
    at: Date.now(),
    read: false,
  });

  await log("send_reward", req.admin!.username, uid,
    `coins:${coins ?? 0} gems:${gems ?? 0} gold:${gold ?? 0}`);

  res.json({ ok: true, uid, updates });
});

// GET /api/admin/promo
router.get("/promo", adminAuth, async (_req, res) => {
  const raw = await rtdbGet("promoCodes");
  const promos = Object.entries((raw ?? {}) as Record<string, unknown>).map(
    ([code, v]) => ({ code, ...(v as object) })
  );
  res.json({ promos });
});

// POST /api/admin/promo
router.post("/promo", adminAuth, async (req, res) => {
  const { code, coins, gems, gold, maxUses, expiresAt } = req.body as {
    code: string; coins?: number; gems?: number; gold?: number; maxUses?: number; expiresAt?: number;
  };
  if (!code) { res.status(400).json({ error: "code is required" }); return; }

  const existing = await rtdbGet(`promoCodes/${code.toUpperCase()}`);
  if (existing) { res.status(409).json({ error: "Promo code already exists" }); return; }

  const promoData = {
    coins: coins ?? 0, gems: gems ?? 0, gold: gold ?? 0,
    maxUses: maxUses ?? 1, uses: 0,
    expiresAt: expiresAt ?? null,
    createdBy: req.admin!.username,
    createdAt: Date.now(),
  };
  await rtdbSet(`promoCodes/${code.toUpperCase()}`, promoData);
  await log("create_promo", req.admin!.username, code.toUpperCase());
  res.json({ ok: true, code: code.toUpperCase(), ...promoData });
});

// DELETE /api/admin/promo/:code
router.delete("/promo/:code", adminAuth, async (req, res) => {
  const { code } = req.params;
  await rtdbRemove(`promoCodes/${code.toUpperCase()}`);
  await log("delete_promo", req.admin!.username, code.toUpperCase());
  res.json({ ok: true, code: code.toUpperCase() });
});

export default router;
