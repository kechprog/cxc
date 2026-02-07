import Database from "better-sqlite3";
import path from "path";
import { initSchema } from "./schema";
import { seedDb } from "./seed";

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (db) return db;

  const dbPath =
    process.env.DATABASE_PATH ??
    path.join(process.cwd(), "data", "reflectif.db");

  console.log(dbPath);
  db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  initSchema(db);

  if (process.env.SEED_DB) {
    seedDb(db);
  }

  return db;
}
