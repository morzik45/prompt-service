import { Router } from "express";
import { z } from "zod";
import { v4 as uuid } from "uuid";
import type { DB } from "../db.js";
import { nowIso } from "../db.js";
import { parseBody } from "../validation.js";

interface PhraseRow {
  id: string;
  categoryId: string;
  textEn: string;
  favorite: number;
  orderIndex: number;
  createdAt: string;
  updatedAt: string;
}

export function phrasesRouter(db: DB) {
  const router = Router();

  router.get("/", (req, res) => {
    const categoryId = req.query.categoryId as string | undefined;
    const rows = categoryId
      ? db.prepare("SELECT * FROM Phrase WHERE categoryId = ? ORDER BY orderIndex ASC").all(categoryId)
      : db.prepare("SELECT * FROM Phrase ORDER BY categoryId ASC, orderIndex ASC").all();
    res.json(rows);
  });

  router.post("/", (req, res) => {
    const body = parseBody(
      z.object({
        categoryId: z.string().uuid(),
        textEn: z.string().min(1),
      }),
      req.body
    ); 
    const textEn = body.textEn.trim();
    const normalized = normalizeText(textEn);
    const exists = db
      .prepare("SELECT 1 FROM Phrase WHERE categoryId = ? AND LOWER(textEn) = ?")
      .get(body.categoryId, normalized);
    if (exists) {
      res.status(409).send("Фраза уже существует");
      return;
    }
    const maxOrder = db
      .prepare("SELECT MAX(orderIndex) as maxOrder FROM Phrase WHERE categoryId = ?")
      .get(body.categoryId) as { maxOrder?: number };
    const nextOrder = (maxOrder?.maxOrder ?? 0) + 1;
    const now = nowIso();
    const row = {
      id: uuid(),
      categoryId: body.categoryId,
      textEn,
      favorite: 0,
      orderIndex: nextOrder,
      createdAt: now,
      updatedAt: now,
    };
    db.prepare(
      "INSERT INTO Phrase (id, categoryId, textEn, favorite, orderIndex, createdAt, updatedAt) VALUES (@id, @categoryId, @textEn, @favorite, @orderIndex, @createdAt, @updatedAt)"
    ).run(row);
    res.status(201).json(row);
  });

  router.post("/bulk", (req, res) => {
    const body = parseBody(
      z.object({
        categoryId: z.string().uuid(),
        lines: z.string().min(1),
      }),
      req.body
    );
    const phrases = body.lines
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
    const existingRows = db
      .prepare("SELECT textEn FROM Phrase WHERE categoryId = ?")
      .all(body.categoryId) as Array<{ textEn: string }>;
    const existingSet = new Set(existingRows.map((row) => normalizeText(row.textEn)));
    const seenInput = new Set<string>();
    const toInsert: string[] = [];
    const duplicates: string[] = [];
    for (const text of phrases) {
      const normalized = normalizeText(text);
      if (existingSet.has(normalized) || seenInput.has(normalized)) {
        duplicates.push(text);
        continue;
      }
      seenInput.add(normalized);
      toInsert.push(text);
    }
    const maxOrder = db
      .prepare("SELECT MAX(orderIndex) as maxOrder FROM Phrase WHERE categoryId = ?")
      .get(body.categoryId) as { maxOrder?: number };
    let orderIndex = (maxOrder?.maxOrder ?? 0) + 1;
    const now = nowIso();
    const stmt = db.prepare(
      "INSERT INTO Phrase (id, categoryId, textEn, favorite, orderIndex, createdAt, updatedAt) VALUES (?, ?, ?, 0, ?, ?, ?)"
    );
    const insertMany = db.transaction((items: string[]) => {
      for (const text of items) {
        stmt.run(uuid(), body.categoryId, text, orderIndex, now, now);
        orderIndex += 1;
      }
    });
    insertMany(toInsert);
    res.status(201).json({ count: toInsert.length, skipped: duplicates.length, duplicates });
  });

  router.put("/:id", (req, res) => {
    const body = parseBody(
      z.object({
        textEn: z.string().min(1).optional(),
        favorite: z.number().int().min(0).max(1).optional(),
        categoryId: z.string().uuid().optional(),
        orderIndex: z.number().int().min(0).optional(),
      }),
      req.body
    );
    const existing = db.prepare("SELECT * FROM Phrase WHERE id = ?").get(req.params.id) as PhraseRow | undefined;
    if (!existing) {
      res.status(404).send("Phrase not found");
      return;
    }
    const nextCategoryId = body.categoryId ?? existing.categoryId;
    let nextOrderIndex = body.orderIndex ?? existing.orderIndex;
    if (body.categoryId && body.categoryId !== existing.categoryId && body.orderIndex === undefined) {
      const maxOrder = db
        .prepare("SELECT MAX(orderIndex) as maxOrder FROM Phrase WHERE categoryId = ?")
        .get(body.categoryId) as { maxOrder?: number };
      nextOrderIndex = (maxOrder?.maxOrder ?? 0) + 1;
    }
    const nextTextEn = body.textEn ? body.textEn.trim() : undefined;
    const updated = {
      ...existing,
      textEn: nextTextEn ?? existing.textEn,
      favorite: body.favorite ?? existing.favorite,
      categoryId: nextCategoryId,
      orderIndex: nextOrderIndex,
      updatedAt: nowIso(),
    };
    db.prepare(
      "UPDATE Phrase SET textEn = @textEn, favorite = @favorite, categoryId = @categoryId, orderIndex = @orderIndex, updatedAt = @updatedAt WHERE id = @id"
    ).run(updated);
    res.json(updated);
  });

  router.delete("/:id", (req, res) => {
    const existing = db.prepare("SELECT id FROM Phrase WHERE id = ?").get(req.params.id);
    if (!existing) {
      res.status(404).send("Phrase not found");
      return;
    }
    db.prepare("DELETE FROM Phrase WHERE id = ?").run(req.params.id);
    res.status(204).end();
  });

  return router;
}

function normalizeText(text: string) {
  return text.trim().toLowerCase().replace(/\s+/g, " ");
}
