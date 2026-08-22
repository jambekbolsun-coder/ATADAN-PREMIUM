import tractorsData from "../data/tractors.json";
import type { Tractor } from "../types";

export const baseTractors = tractorsData as Tractor[];

const seriesGalleries: Record<string, string[]> = {
  b: ["/images/series/b-01.jpg", "/images/series/b-02.jpg", "/images/series/b-03.jpg"],
  c: ["/images/series/c-01.jpg", "/images/series/c-02.jpg", "/images/series/c-03.jpg"],
  dm: ["/images/series/dm-01.jpg", "/images/series/dm-02.jpg", "/images/series/dm-03.jpg"],
  eh: ["/images/series/eh-01.jpg", "/images/series/eh-02.jpg", "/images/series/eh-03.jpg"],
  ex: ["/images/series/ex-01.jpg", "/images/series/ex-02.jpg", "/images/series/ex-03.jpg"],
  f: ["/images/series/f-01.jpg", "/images/series/f-02.jpg", "/images/series/f-03.jpg"],
  g: ["/images/series/g-01.jpg", "/images/series/g-02.jpg", "/images/series/g-03.jpg"],
  hm: ["/images/series/hm-01.jpg", "/images/series/hm-02.jpg", "/images/series/hm-03.jpg"],
  j: ["/images/series/j-01.jpg", "/images/series/j-02.jpg", "/images/series/j-03.jpg"],
  k: ["/images/series/k-01.jpg"],
};

function seriesFor(model: string) {
  if (model.startsWith("CFB")) return "b";
  if (model.startsWith("CFC")) return "c";
  if (model.startsWith("CFD")) return "dm";
  if (model.startsWith("CFE") && model.includes("X")) return "ex";
  if (model.startsWith("CFE")) return "eh";
  if (model.startsWith("CFF")) return "f";
  if (model.startsWith("CFG")) return "g";
  if (model.startsWith("CFH")) return "hm";
  if (model.startsWith("CFJ")) return "j";
  if (model.startsWith("CFK")) return "k";
  return "";
}

function withGallery(tractor: Tractor): Tractor {
  const curated = tractor.images?.filter(Boolean) ?? [];
  const hasCustomGallery = curated.length > 1 || (curated.length === 1 && curated[0] !== tractor.image);
  const gallery = hasCustomGallery ? [tractor.image, ...curated] : [tractor.image, ...(seriesGalleries[seriesFor(tractor.model)] ?? [])];
  const fiveViews = [
    ...gallery,
    "/images/series/changfa-rear.webp",
    "/images/series/changfa-side.webp",
    "/images/banners/about.webp",
  ];
  return { ...tractor, images: Array.from(new Set(fiveViews)).slice(0, 5) };
}

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
      catalog.push(withGallery(change ? { ...tractor, ...JSON.parse(change.data_json) } : tractor));
      changes.delete(tractor.slug);
    }
    for (const change of changes.values()) {
      if (!change.is_deleted) catalog.push(withGallery(JSON.parse(change.data_json)));
    }
    return catalog.sort((a, b) => a.hp - b.hp || a.model.localeCompare(b.model));
  } catch {
    return baseTractors.map(withGallery);
  }
}

export async function getTractor(slug: string) {
  const catalog = await getCatalog();
  return catalog.find((tractor) => tractor.slug === slug) ?? null;
}
