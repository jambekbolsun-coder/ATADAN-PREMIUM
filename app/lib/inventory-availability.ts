import type { Tractor } from "../types";

export type InventoryAvailability = {
  tractor_slug: string;
  available_units: number | string;
};

/** Inventory is the sole source of truth for public availability. */
export function applyInventoryAvailability(
  tractors: Tractor[],
  rows: InventoryAvailability[],
): Tractor[] {
  const available = new Map(
    rows.map((row) => [row.tractor_slug, Math.max(0, Number(row.available_units) || 0)]),
  );
  return tractors.map((tractor) => {
    const availableUnits = available.get(tractor.slug) ?? 0;
    return { ...tractor, availableUnits, inStock: availableUnits > 0 };
  });
}
