import { Router } from "express";
import { z } from "zod";
import { v4 as uuid } from "uuid";
import type { DB } from "../db.js";
import { getSettings, nowIso } from "../db.js";
import { parseBody } from "../validation.js";
import { buildPrompt } from "../prompt.js";

interface PromptRow {
  id: string;
  title: string;
  content: string;
  tokensJson: string | null;
  createdAt: string;
  updatedAt: string;
}

export function promptsRouter(db: DB) {
  const router = Router();

  router.get("/", (_req, res) => {
    const rows = db.prepare("SELECT * FROM PromptSaved ORDER BY updatedAt DESC").all() as PromptRow[];
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
          title: z.string().optional(),
          content: z.string().optional(),
          tokens: z.array(z.string()).optional(),
        })
        .refine((data) => (data.content && data.content.trim()) || (data.tokens && data.tokens.length), {
          message: "Нужен content или tokens",
        }),
      req.body
    );
    const now = nowIso();
    const settings = getSettings(db);
    const tokens = body.tokens?.map((item) => item.trim()).filter(Boolean) ?? null;
    const content = body.content?.trim() || (tokens ? buildPrompt(tokens, settings.joinMode as "space" | "comma" | "sentence") : "");
    const row = {
      id: uuid(),
      title: body.title?.trim() ?? "",
      content,
      tokensJson: tokens ? JSON.stringify(tokens) : null,
      createdAt: now,
      updatedAt: now,
    };
    db.prepare(
      "INSERT INTO PromptSaved (id, title, content, tokensJson, createdAt, updatedAt) VALUES (@id, @title, @content, @tokensJson, @createdAt, @updatedAt)"
    ).run(row);
    res.status(201).json({ ...row, tokens: tokens ?? [] });
  });

  router.put("/:id", (req, res) => {
    const body = parseBody(
      z.object({
        title: z.string().optional(),
        content: z.string().optional(),
        tokens: z.array(z.string()).optional(),
      }),
      req.body
    );
    const existing = db.prepare("SELECT * FROM PromptSaved WHERE id = ?").get(req.params.id) as PromptRow | undefined;
    if (!existing) {
      res.status(404).send("Prompt not found");
      return;
    }
    const settings = getSettings(db);
    const tokens = body.tokens?.map((item) => item.trim()).filter(Boolean);
    const nextContent =
      body.content?.trim() ||
      (tokens ? buildPrompt(tokens, settings.joinMode as "space" | "comma" | "sentence") : existing.content);
    const updated = {
      ...existing,
      title: body.title !== undefined ? body.title.trim() : existing.title,
      content: nextContent,
      tokensJson: tokens ? JSON.stringify(tokens) : existing.tokensJson,
      updatedAt: nowIso(),
    };
    db.prepare(
      "UPDATE PromptSaved SET title = @title, content = @content, tokensJson = @tokensJson, updatedAt = @updatedAt WHERE id = @id"
    ).run(updated);
    res.json({ ...updated, tokens: parseTokens(updated.tokensJson) });
  });

  router.delete("/:id", (req, res) => {
    const existing = db.prepare("SELECT id FROM PromptSaved WHERE id = ?").get(req.params.id);
    if (!existing) {
      res.status(404).send("Prompt not found");
      return;
    }
    db.prepare("DELETE FROM PromptSaved WHERE id = ?").run(req.params.id);
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
