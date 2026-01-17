import express from "express";
import cors from "cors";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { initDb } from "./db.js";
import { categoriesRouter } from "./routes/categories.js";
import { phrasesRouter } from "./routes/phrases.js";
import { promptsRouter } from "./routes/prompts.js";
import { historyRouter } from "./routes/history.js";
import { settingsRouter } from "./routes/settings.js";
import { exportRouter } from "./routes/export.js";
import { lmRouter } from "./routes/lm.js";
import { backupRouter } from "./routes/backup.js";
import { HttpError } from "./errors.js";

export function createApp({ dbPath }: { dbPath?: string } = {}) {
  const db = initDb(dbPath);
  const app = express();

  app.use(cors({ origin: true }));
  app.use(express.json({ limit: "2mb" }));

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true });
  });

  app.use("/api/categories", categoriesRouter(db));
  app.use("/api/phrases", phrasesRouter(db));
  app.use("/api/prompts", promptsRouter(db));
  app.use("/api/history", historyRouter(db));
  app.use("/api/settings", settingsRouter(db));
  app.use("/api/export", exportRouter(db));
  app.use("/api/lm", lmRouter(db));
  app.use("/api/backup", backupRouter(db));

  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const clientDist = path.resolve(__dirname, "..", "..", "client", "dist");
  if (fs.existsSync(clientDist)) {
    app.use(express.static(clientDist));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(clientDist, "index.html"));
    });
  }

  app.use((req, res) => {
    res.status(404).json({ error: `Not found: ${req.path}` });
  });

  app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    if (err instanceof HttpError) {
      res.status(err.status).send(err.message);
      return;
    }
    console.error(err);
    res.status(500).send("Server error");
  });

  return { app, db };
}
