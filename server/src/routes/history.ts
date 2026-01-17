import { Router } from "express";
import { z } from "zod";
import { v4 as uuid } from "uuid";
import type { DB } from "../db.js";
import { getSettings, nowIso } from "../db.js";
import { parseBody } from "../validation.js";
import { buildPrompt } from "../prompt.js";

interface HistoryRow {
  id: string;
  content: string;
  tokensJson: string | null;
  createdAt: string;
  source: string;
}

export function historyRouter(db: DB) {
  const router = Router();

  router.get("/", (req, res) => {
    const limit = Number.parseInt((req.query.limit as string) ?? "50", 10);
    const rows = db
      .prepare("SELECT * FROM PromptHistory ORDER BY createdAt DESC LIMIT ?")
      .all(Number.isNaN(limit) ? 50 : limit) as HistoryRow[];
    res.json(
      rows.map((row) => ({
        ...row,
        tokens: parseTokens(row.tokensJson),
      }))
    );
  });

  router.post("/", (req, res) => {
    const body = parseBody(
      z
        .object({
          content: z.string().optional(),
          source: z.string().min(1),
          tokens: z.array(z.string()).optional(),
        })
        .refine((data) => (data.content && data.content.trim()) || (data.tokens && data.tokens.length), {
          message: "Нужен content или tokens",
        }),
      req.body
    );
    const settings = getSettings(db);
    const tokens = body.tokens?.map((item) => item.trim()).filter(Boolean) ?? null;
    const content = body.content?.trim() || (tokens ? buildPrompt(tokens, settings.joinMode as "space" | "comma" | "sentence") : "");
    const row = {
      id: uuid(),
      content,
      tokensJson: tokens ? JSON.stringify(tokens) : null,
      source: body.source,
      createdAt: nowIso(),
    };
    db.prepare(
      "INSERT INTO PromptHistory (id, content, tokensJson, createdAt, source) VALUES (@id, @content, @tokensJson, @createdAt, @source)"
    ).run(row);
    res.status(201).json({ ...row, tokens: tokens ?? [] });
  });

  router.delete("/:id", (req, res) => {
    const existing = db.prepare("SELECT id FROM PromptHistory WHERE id = ?").get(req.params.id);
    if (!existing) {
      res.status(404).send("History item not found");
      return;
    }
    db.prepare("DELETE FROM PromptHistory WHERE id = ?").run(req.params.id);
    res.status(204).end();
  });

  return router;
}

function parseTokens(tokensJson: string | null) {
  if (!tokensJson) return [];
  try {
    const parsed = JSON.parse(tokensJson);
    if (Array.isArray(parsed)) {
      return parsed.filter((item) => typeof item === "string");
    }
  } catch {
    return [];
  }
  return [];
}
