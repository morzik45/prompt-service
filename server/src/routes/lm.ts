import { Router } from "express";
import { z } from "zod";
import type { DB } from "../db.js";
import { getSettings } from "../db.js";
import { parseBody } from "../validation.js";
import { HttpError } from "../errors.js";

const modePrompt: Record<string, string> = {
  ru2en:
    "Translate Russian text into natural, concise English prompt text for image generation.\nOutput only English text.",
  en2ru: "Translate English prompt text into Russian. Output only Russian text.",
  improve:
    "Rewrite the English prompt text to sound more natural and useful for image generation. Keep meaning. Output only the improved prompt.",
};

export function lmRouter(db: DB) {
  const router = Router();

  router.post("/", async (req, res, next) => {
    try {
      const body = parseBody(
        z.object({
          mode: z.enum(["ru2en", "en2ru", "improve"]),
          text: z.string().min(1),
        }),
        req.body
      );
      const settings = getSettings(db);
      const systemPrompt = modePrompt[body.mode];
      const payload = {
        model: settings.lmModel ?? "local-model",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: body.text },
        ],
        ...(settings.lmUseTemperature ? { temperature: settings.lmTemperature } : {}),
        ...(settings.lmUseTopP ? { top_p: settings.lmTopP } : {}),
        ...(settings.lmUseTopK ? { top_k: settings.lmTopK } : {}),
      };

      const url = `${settings.lmBaseUrl.replace(/\/$/, "")}/chat/completions`;
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${settings.lmApiKey}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const text = await response.text();
        throw new HttpError(response.status, text || "LM Studio error");
      }

      const data = (await response.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };

      const text = data.choices?.[0]?.message?.content?.trim();
      if (!text) {
        throw new HttpError(500, "Пустой ответ от LM Studio");
      }

      res.json({ text });
    } catch (error) {
      next(error instanceof HttpError ? error : new HttpError(400, error instanceof Error ? error.message : "LM error"));
    }
  });

  return router;
}
