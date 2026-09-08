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
    // Schema changes belong exclusively to versioned SQL migrations in /drizzle.
    // This probe fails early when a deployment missed a migration without mutating data at runtime.
    await getRawDb().prepare("SELECT 1 FROM product_overrides LIMIT 1").first();
  })().catch((error) => {
    initialized = null;
    throw error;
  });
  return initialized;
}
