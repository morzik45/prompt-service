import { Router } from "express";
import { z } from "zod";
import fs from "node:fs/promises";
import path from "node:path";
import type { DB } from "../db.js";
import { getSettings, updateSettings } from "../db.js";
import { parseBody } from "../validation.js";
import { HttpError } from "../errors.js";

const joinModeSchema = z.union([z.literal("space"), z.literal("comma"), z.literal("sentence")]);

export function settingsRouter(db: DB) {
  const router = Router();

  router.get("/", (_req, res) => {
    res.json(getSettings(db));
  });

  router.put("/", (req, res) => {
    const body = parseBody(
      z.object({
        promptOutputPath: z.string().min(1).optional(),
        joinMode: joinModeSchema.optional(),
        lmBaseUrl: z.string().min(1).optional(),
        lmApiKey: z.string().min(1).optional(),
        lmModel: z.string().nullable().optional(),
        lmTemperature: z.number().min(0).max(2).optional(),
        lmTopP: z.number().min(0).max(1).optional(),
        lmTopK: z.number().int().min(0).optional(),
        lmUseTemperature: z.union([z.boolean(), z.number().int().min(0).max(1)]).optional(),
        lmUseTopP: z.union([z.boolean(), z.number().int().min(0).max(1)]).optional(),
        lmUseTopK: z.union([z.boolean(), z.number().int().min(0).max(1)]).optional(),
      }),
      req.body
    );
    const normalized = {
      ...body,
      lmUseTemperature:
        body.lmUseTemperature === undefined ? undefined : body.lmUseTemperature ? 1 : 0,
      lmUseTopP: body.lmUseTopP === undefined ? undefined : body.lmUseTopP ? 1 : 0,
      lmUseTopK: body.lmUseTopK === undefined ? undefined : body.lmUseTopK ? 1 : 0,
    };
    const updated = updateSettings(db, normalized);
    res.json(updated);
  });

  router.post("/check-path", async (req, res, next) => {
    try {
      const body = parseBody(z.object({ promptOutputPath: z.string().min(1) }), req.body);
      const outputPath = body.promptOutputPath;
      const dir = path.dirname(outputPath);
      await fs.mkdir(dir, { recursive: true });
      const handle = await fs.open(outputPath, "w");
      await handle.close();
      res.json({ ok: true, path: outputPath });
    } catch (error) {
      next(new HttpError(400, error instanceof Error ? error.message : "Не удалось проверить путь"));
    }
  });

  return router;
}
