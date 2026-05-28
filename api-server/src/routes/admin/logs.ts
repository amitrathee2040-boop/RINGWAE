/**
 * Activity logs route.
 * GET /api/admin/logs — retrieve paginated admin activity logs
 */
import { Router } from "express";
import { adminAuth } from "../../middlewares/admin-auth.js";
import { rtdbGet } from "../../lib/firebase-admin.js";

const router = Router();

router.get("/", adminAuth, async (req, res) => {
  const page = Math.max(1, parseInt(req.query["page"] as string ?? "1", 10));
  const limit = Math.min(100, parseInt(req.query["limit"] as string ?? "50", 10));
  const filterType = req.query["type"] as string | undefined;

  const raw = await rtdbGet("adminLogs");
  const logsMap = (raw ?? {}) as Record<string, Record<string, unknown>>;

  let logs: Array<Record<string, unknown> & { id: string }> = Object.entries(logsMap).map(([id, v]) => ({ ...v, id } as Record<string, unknown> & { id: string }));

  if (filterType) {
    logs = logs.filter((l) => (l["type"] as string | undefined) === filterType);
  }

  logs.sort((a, b) => ((b["at"] as number | undefined) ?? 0) - ((a["at"] as number | undefined) ?? 0));

  const total = logs.length;
  res.json({
    logs: logs.slice((page - 1) * limit, page * limit),
    total,
    page,
    limit,
    pages: Math.ceil(total / limit),
  });
});

export default router;
