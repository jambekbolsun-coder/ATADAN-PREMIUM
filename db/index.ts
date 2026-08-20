import { env } from "cloudflare:workers";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";

let initialized: Promise<void> | null = null;

export function getDb() {
  if (!env.DB) {
    throw new Error(
      "Cloudflare D1 binding `DB` is unavailable. Set the `d1` field in .openai/hosting.json to `DB` or let your control plane inject the real binding values before using the database."
    );
  }

  return drizzle(env.DB, { schema });
}

export function getRawDb() {
  if (!env.DB) throw new Error("D1 binding DB is unavailable");
  return env.DB;
}

export async function ensureDb() {
  if (initialized) return initialized;
  initialized = (async () => {
    const d1 = getRawDb();
    await d1.batch([
      d1.prepare(`CREATE TABLE IF NOT EXISTS product_overrides (
        slug TEXT PRIMARY KEY,
        data_json TEXT NOT NULL DEFAULT '{}',
        is_deleted INTEGER NOT NULL DEFAULT 0,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )`),
      d1.prepare(`CREATE TABLE IF NOT EXISTS leads (
        id TEXT PRIMARY KEY,
        tractor_slug TEXT,
        tractor_model TEXT,
        name TEXT NOT NULL,
        phone TEXT NOT NULL,
        message TEXT NOT NULL DEFAULT '',
        status TEXT NOT NULL DEFAULT 'new',
        source TEXT NOT NULL DEFAULT 'website',
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )`),
      d1.prepare(`CREATE TABLE IF NOT EXISTS interest_events (
        id TEXT PRIMARY KEY,
        tractor_slug TEXT,
        path TEXT NOT NULL,
        event_type TEXT NOT NULL DEFAULT 'page_view',
        visitor_id TEXT,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )`),
      d1.prepare(`CREATE TABLE IF NOT EXISTS admin_profile (
        id INTEGER PRIMARY KEY,
        display_name TEXT NOT NULL DEFAULT 'Администратор ATADAN',
        phone TEXT NOT NULL DEFAULT '+996 706 131 404',
        email TEXT NOT NULL DEFAULT 'admin@atadan.kg',
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )`),
      d1.prepare("CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at)"),
      d1.prepare("CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status)"),
      d1.prepare("CREATE INDEX IF NOT EXISTS idx_events_tractor_created ON interest_events(tractor_slug, created_at)"),
      d1.prepare("CREATE INDEX IF NOT EXISTS idx_events_path_created ON interest_events(path, created_at)"),
    ]);
    await d1.prepare("INSERT OR IGNORE INTO admin_profile (id) VALUES (1)").run();
    await d1.prepare("PRAGMA optimize").run();
  })().catch((error) => {
    initialized = null;
    throw error;
  });
  return initialized;
}
