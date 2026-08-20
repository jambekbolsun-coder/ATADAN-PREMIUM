import tractorsData from "../data/tractors.json";
import type { Tractor } from "../types";

export const baseTractors = tractorsData as Tractor[];

export async function getCatalog(): Promise<Tractor[]> {
  try {
    const { ensureDb, getRawDb } = await import("../../db");
    await ensureDb();
    const result = await getRawDb()
      .prepare("SELECT slug, data_json, is_deleted FROM product_overrides")
      .all<{ slug: string; data_json: string; is_deleted: number }>();
    const changes = new Map(result.results.map((row) => [row.slug, row]));
    const catalog: Tractor[] = [];
    for (const tractor of baseTractors) {
      const change = changes.get(tractor.slug);
      if (change?.is_deleted) continue;
      catalog.push(change ? { ...tractor, ...JSON.parse(change.data_json) } : tractor);
      changes.delete(tractor.slug);
    }
    for (const change of changes.values()) {
      if (!change.is_deleted) catalog.push(JSON.parse(change.data_json));
    }
    return catalog.sort((a, b) => a.hp - b.hp || a.model.localeCompare(b.model));
  } catch {
    return baseTractors;
  }
}

export async function getTractor(slug: string) {
  const catalog = await getCatalog();
  return catalog.find((tractor) => tractor.slug === slug) ?? null;
}
