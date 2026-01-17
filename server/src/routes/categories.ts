import { Router } from "express";
import { z } from "zod";
import { v4 as uuid } from "uuid";
import type { DB } from "../db.js";
import { nowIso } from "../db.js";
import { parseBody } from "../validation.js";

interface CategoryRow {
  id: string;
  name: string;
  orderIndex: number;
  createdAt: string;
  updatedAt: string;
}

export function categoriesRouter(db: DB) {
  const router = Router();

  router.get("/", (_req, res) => {
    const rows = db.prepare("SELECT * FROM Category ORDER BY orderIndex ASC").all();
    res.json(rows);
  });

  router.post("/", (req, res) => {
    const body = parseBody(z.object({ name: z.string().min(1) }), req.body);
    const maxOrder = db.prepare("SELECT MAX(orderIndex) as maxOrder FROM Category").get() as { maxOrder?: number };
    const nextOrder = (maxOrder?.maxOrder ?? 0) + 1;
    const now = nowIso();
    const row = {
      id: uuid(),
      name: body.name,
      orderIndex: nextOrder,
      createdAt: now,
      updatedAt: now,
    };
    db.prepare(
      "INSERT INTO Category (id, name, orderIndex, createdAt, updatedAt) VALUES (@id, @name, @orderIndex, @createdAt, @updatedAt)"
    ).run(row);
    res.status(201).json(row);
  });

  router.put("/:id", (req, res) => {
    const body = parseBody(
      z.object({
        name: z.string().min(1).optional(),
        orderIndex: z.number().int().optional(),
      }),
      req.body
    );
    const existing = db.prepare("SELECT * FROM Category WHERE id = ?").get(req.params.id) as CategoryRow | undefined;
    if (!existing) {
      res.status(404).send("Category not found");
      return;
    }
    const updated = {
      ...existing,
      name: body.name ?? existing.name,
      orderIndex: body.orderIndex ?? existing.orderIndex,
      updatedAt: nowIso(),
    };
    db.prepare(
      "UPDATE Category SET name = @name, orderIndex = @orderIndex, updatedAt = @updatedAt WHERE id = @id"
    ).run(updated);
    res.json(updated);
  });

  router.delete("/:id", (req, res) => {
    const category = db.prepare("SELECT id FROM Category WHERE id = ?").get(req.params.id);
    if (!category) {
      res.status(404).send("Category not found");
      return;
    }
    db.prepare("DELETE FROM Phrase WHERE categoryId = ?").run(req.params.id);
    db.prepare("DELETE FROM Category WHERE id = ?").run(req.params.id);
    res.status(204).end();
  });

  return router;
}
