import Database from "better-sqlite3";
import path from "node:path";

export type DB = Database.Database;

export const DEFAULT_SETTINGS = {
  id: 1,
  promptOutputPath: "C:\\CU\\text_input\\prompt.txt",
  joinMode: "space",
  lmBaseUrl: "http://127.0.0.1:1234/v1",
  lmApiKey: "lm-studio",
  lmModel: null as string | null,
  lmTemperature: 0.2,
  lmTopP: 0.9,
  lmTopK: 40,
  lmUseTemperature: 1,
  lmUseTopP: 1,
  lmUseTopK: 1,
};

export function initDb(dbPath?: string): DB {
  const resolvedPath = dbPath ?? path.join(process.cwd(), "db.sqlite");
  const db = new Database(resolvedPath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  db.exec(`
    CREATE TABLE IF NOT EXISTS Category (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      orderIndex INTEGER NOT NULL,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS Phrase (
      id TEXT PRIMARY KEY,
      categoryId TEXT NOT NULL,
      textEn TEXT NOT NULL,
      favorite INTEGER NOT NULL DEFAULT 0,
      orderIndex INTEGER NOT NULL DEFAULT 0,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      FOREIGN KEY (categoryId) REFERENCES Category(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS PromptSaved (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      tokensJson TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS PromptHistory (
      id TEXT PRIMARY KEY,
      content TEXT NOT NULL,
      tokensJson TEXT,
      createdAt TEXT NOT NULL,
      source TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS AppSettings (
      id INTEGER PRIMARY KEY,
      promptOutputPath TEXT NOT NULL,
      joinMode TEXT NOT NULL,
      lmBaseUrl TEXT NOT NULL,
      lmApiKey TEXT NOT NULL,
      lmModel TEXT,
      lmTemperature REAL NOT NULL,
      lmTopP REAL NOT NULL,
      lmTopK INTEGER NOT NULL,
      lmUseTemperature INTEGER NOT NULL,
      lmUseTopP INTEGER NOT NULL,
      lmUseTopK INTEGER NOT NULL
    );
  `);

  ensureColumn(db, "Phrase", "orderIndex", "INTEGER NOT NULL DEFAULT 0");
  ensureColumn(db, "PromptSaved", "tokensJson", "TEXT");
  ensureColumn(db, "PromptHistory", "tokensJson", "TEXT");
  ensureColumn(db, "AppSettings", "lmTemperature", "REAL NOT NULL DEFAULT 0.2");
  ensureColumn(db, "AppSettings", "lmTopP", "REAL NOT NULL DEFAULT 0.9");
  ensureColumn(db, "AppSettings", "lmTopK", "INTEGER NOT NULL DEFAULT 40");
  ensureColumn(db, "AppSettings", "lmUseTemperature", "INTEGER NOT NULL DEFAULT 1");
  ensureColumn(db, "AppSettings", "lmUseTopP", "INTEGER NOT NULL DEFAULT 1");
  ensureColumn(db, "AppSettings", "lmUseTopK", "INTEGER NOT NULL DEFAULT 1");

  const row = db.prepare("SELECT id FROM AppSettings WHERE id = 1").get();
  if (!row) {
    db.prepare(
      `INSERT INTO AppSettings (id, promptOutputPath, joinMode, lmBaseUrl, lmApiKey, lmModel, lmTemperature, lmTopP, lmTopK, lmUseTemperature, lmUseTopP, lmUseTopK)
       VALUES (@id, @promptOutputPath, @joinMode, @lmBaseUrl, @lmApiKey, @lmModel, @lmTemperature, @lmTopP, @lmTopK, @lmUseTemperature, @lmUseTopP, @lmUseTopK)`
    ).run(DEFAULT_SETTINGS);
  }

  backfillPhraseOrder(db);
  return db;
}

function ensureColumn(db: DB, table: string, column: string, type: string) {
  const columns = db.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>;
  if (!columns.some((item) => item.name === column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`);
  }
}

export function getSettings(db: DB) {
  return db.prepare("SELECT * FROM AppSettings WHERE id = 1").get() as typeof DEFAULT_SETTINGS;
}

export function updateSettings(db: DB, patch: Partial<typeof DEFAULT_SETTINGS>) {
  const current = getSettings(db);
  const next = { ...current, ...patch };
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
  ).run(next);
  return next;
}

export function nowIso() {
  return new Date().toISOString();
}

function backfillPhraseOrder(db: DB) {
  const categories = db.prepare("SELECT id FROM Category").all() as Array<{ id: string }>;
  const update = db.prepare("UPDATE Phrase SET orderIndex = ? WHERE id = ?");
  for (const category of categories) {
    const phrases = db
      .prepare("SELECT id, orderIndex FROM Phrase WHERE categoryId = ? ORDER BY createdAt ASC")
      .all(category.id) as Array<{ id: string; orderIndex: number | null }>;
    let index = 1;
    for (const phrase of phrases) {
      if (!phrase.orderIndex || phrase.orderIndex === 0) {
        update.run(index, phrase.id);
      }
      index += 1;
    }
  }
}
