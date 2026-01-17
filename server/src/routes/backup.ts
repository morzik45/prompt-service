import { Router } from "express";
import { z } from "zod";
import { DEFAULT_SETTINGS, type DB } from "../db.js";
import { parseBody } from "../validation.js";
import { HttpError } from "../errors.js";

const backupSchema = z.object({
  categories: z.array(z.any()),
  phrases: z.array(z.any()),
  prompts: z.array(z.any()),
  history: z.array(z.any()),
  settings: z.any(),
});

export function backupRouter(db: DB) {
  const router = Router();

  router.get("/export", (_req, res) => {
    const categories = db.prepare("SELECT * FROM Category").all();
    const phrases = db.prepare("SELECT * FROM Phrase").all();
    const prompts = db.prepare("SELECT * FROM PromptSaved").all();
    const history = db.prepare("SELECT * FROM PromptHistory").all();
    const settings = db.prepare("SELECT * FROM AppSettings WHERE id = 1").get();
    res.json({ categories, phrases, prompts, history, settings });
  });

  router.post("/import", (req, res, next) => {
    try {
      const body = parseBody(backupSchema, req.body);
      const tx = db.transaction(() => {
        db.prepare("DELETE FROM Phrase").run();
        db.prepare("DELETE FROM Category").run();
        db.prepare("DELETE FROM PromptSaved").run();
        db.prepare("DELETE FROM PromptHistory").run();

        const insertCategory = db.prepare(
          "INSERT INTO Category (id, name, orderIndex, createdAt, updatedAt) VALUES (@id, @name, @orderIndex, @createdAt, @updatedAt)"
        );
        const insertPhrase = db.prepare(
          "INSERT INTO Phrase (id, categoryId, textEn, favorite, orderIndex, createdAt, updatedAt) VALUES (@id, @categoryId, @textEn, @favorite, @orderIndex, @createdAt, @updatedAt)"
        );
        const insertPrompt = db.prepare(
          "INSERT INTO PromptSaved (id, title, content, tokensJson, createdAt, updatedAt) VALUES (@id, @title, @content, @tokensJson, @createdAt, @updatedAt)"
        );
        const insertHistory = db.prepare(
          "INSERT INTO PromptHistory (id, content, tokensJson, createdAt, source) VALUES (@id, @content, @tokensJson, @createdAt, @source)"
        );

        for (const item of body.categories) insertCategory.run(item);
        for (const item of body.phrases) {
          insertPhrase.run({ ...item, orderIndex: item.orderIndex ?? 0 });
        }
        for (const item of body.prompts) insertPrompt.run(item);
        for (const item of body.history) insertHistory.run(item);

        if (body.settings) {
          const settings = { ...DEFAULT_SETTINGS, ...body.settings };
          db.prepare(
            `UPDATE AppSettings
             SET promptOutputPath = @promptOutputPath,
                 joinMode = @joinMode,
                 lmBaseUrl = @lmBaseUrl,
                 lmApiKey = @lmApiKey,
                 lmModel = @lmModel,
                 lmTemperature = @lmTemperature,
                 lmTopP = @lmTopP,
                 lmTopK = @lmTopK,
                 lmUseTemperature = @lmUseTemperature,
                 lmUseTopP = @lmUseTopP,
                 lmUseTopK = @lmUseTopK
             WHERE id = 1`
          ).run(settings);
        }
      });

      tx();
      res.json({ ok: true });
    } catch (error) {
      next(new HttpError(400, error instanceof Error ? error.message : "Не удалось импортировать"));
    }
  });

  return router;
}
