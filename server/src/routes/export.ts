import { Router } from "express";
import { z } from "zod";
import fs from "node:fs/promises";
import path from "node:path";
import type { DB } from "../db.js";
import { getSettings, nowIso } from "../db.js";
import { parseBody } from "../validation.js";
import { HttpError } from "../errors.js";
import { buildPrompt } from "../prompt.js";
import { v4 as uuid } from "uuid";

export function exportRouter(db: DB) {
  const router = Router();

  router.post("/", async (req, res, next) => {
    try {
      const body = parseBody(z.object({ tokens: z.array(z.string()) }), req.body);
      const settings = getSettings(db);
      if (!settings.promptOutputPath.trim()) {
        throw new HttpError(400, "Путь для экспорта не задан");
      }
      const finalText = buildPrompt(body.tokens, settings.joinMode as "space" | "comma" | "sentence");
      const dir = path.dirname(settings.promptOutputPath);
      await fs.mkdir(dir, { recursive: true });
      const bytesWritten = await fs.writeFile(settings.promptOutputPath, finalText, { encoding: "utf8" }).then(() =>
        Buffer.byteLength(finalText, "utf8")
      );

      const historyRow = {
        id: uuid(),
        content: finalText,
        tokensJson: JSON.stringify(body.tokens.map((token) => token.trim()).filter(Boolean)),
        createdAt: nowIso(),
        source: "export",
      };
      db.prepare(
        "INSERT INTO PromptHistory (id, content, tokensJson, createdAt, source) VALUES (@id, @content, @tokensJson, @createdAt, @source)"
      ).run(historyRow);

      res.json({ ok: true, path: settings.promptOutputPath, bytesWritten, finalText });
    } catch (error) {
      next(new HttpError(400, error instanceof Error ? error.message : "Ошибка экспорта"));
    }
  });

  return router;
}
