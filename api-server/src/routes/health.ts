import { Router, type IRouter } from "express";
import { z } from "zod";

// Inlined from former @workspace/api-zod package
export const HealthCheckResponse = z.object({ status: z.literal("ok") });
export type HealthCheckResponse = z.infer<typeof HealthCheckResponse>;

const router: IRouter = Router();

router.get("/healthz", (_req, res) => {
  const data = HealthCheckResponse.parse({ status: "ok" });
  res.json(data);
});

export default router;
