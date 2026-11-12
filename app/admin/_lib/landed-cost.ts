/**
 * Себестоимость техники по заказу заводу.
 *
 * Себестоимость машины = цена завода × курс заказа + её доля внесённых расходов
 * (пошлина, транспорт, НДС, сборы, брокер, СВХ и прочее).
 *
 * Расходы распределяются по «местам» заказа: место = одна заказанная машина (кол-во в позиции).
 * Отгруженная машина занимает место своей позиции, ещё не отгруженные места остаются пустыми,
 * поэтому расход на весь заказ не ложится целиком на первую поставку.
 *  - расход на весь заказ: по местам пропорционально цене завода;
 *  - расход на модель: поровну на места этой позиции;
 *  - расход поставки: на её машины способом поставки (по цене / поровну / вручную).
 *
 * Модуль чистый (без базы): его считают и сервер при пересчёте, и тесты.
 */

export const COST_ITEMS: { key: string; label: string }[] = [
  { key: "duty", label: "Таможенная пошлина" },
  { key: "freight", label: "Транспорт (фрахт)" },
  { key: "vat", label: "НДС на импорт" },
  { key: "customs_fee", label: "Таможенные сборы" },
  { key: "tax", label: "Налоги" },
  { key: "broker", label: "Брокерские услуги" },
  { key: "storage", label: "Расходы по СВХ (хранение)" },
  { key: "certification", label: "Сертификация" },
  { key: "unloading", label: "Разгрузка" },
  { key: "other", label: "Другое" },
];
export const COST_LABEL: Record<string, string> = Object.fromEntries(COST_ITEMS.map((c) => [c.key, c.label]));

export type CalcLine = { id: string; qty: number; /** цена завода за 1 шт. в валюте заказа, minor */ price: number };
export type CalcFact = { kgs: number; lineId: string | null; shipmentId: string | null };
export type CalcUnit = { id: string; lineId: string | null; shipmentId: string | null; /** закупка старых машин без позиции заказа, сом minor */ legacyKgs: number; /** ручная доля расходов поставки, сом minor */ manual: number | null };
export type CalcShipment = { id: string; method: string };

type Slot = { unitId: string | null; lineId: string | null; shipmentId: string | null; purchaseKgs: number; purchasePo: number; factKgs: number };

export function computeOrder(input: { rate: number; lines: CalcLine[]; facts: CalcFact[]; units: CalcUnit[]; shipments: CalcShipment[] }) {
  const rate = input.rate > 0 ? input.rate : 1;
  const lineById = new Map(input.lines.map((l) => [l.id, l]));
  const slots: Slot[] = [];

  // места: отгруженные машины занимают места своих позиций, остальные места пустые
  for (const line of input.lines) {
    const units = input.units.filter((u) => u.lineId === line.id);
    for (const u of units) slots.push({ unitId: u.id, lineId: line.id, shipmentId: u.shipmentId, purchaseKgs: line.price * rate, purchasePo: line.price, factKgs: 0 });
    for (let i = units.length; i < line.qty; i += 1) slots.push({ unitId: null, lineId: line.id, shipmentId: null, purchaseKgs: line.price * rate, purchasePo: line.price, factKgs: 0 });
  }
  for (const u of input.units) {
    if (u.lineId && lineById.has(u.lineId)) continue;
    slots.push({ unitId: u.id, lineId: null, shipmentId: u.shipmentId, purchaseKgs: u.legacyKgs, purchasePo: u.legacyKgs / rate, factKgs: 0 });
  }
  const unitById = new Map(input.units.map((u) => [u.id, u]));

  // расходы на заказ и на модель
  const shipmentFacts = new Map<string, CalcFact[]>();
  for (const f of input.facts) {
    if (f.shipmentId) { shipmentFacts.set(f.shipmentId, [...(shipmentFacts.get(f.shipmentId) ?? []), f]); continue; }
    const targets = f.lineId ? slots.filter((s) => s.lineId === f.lineId) : slots;
    if (!targets.length) continue;
    const base = targets.reduce((sum, s) => sum + s.purchasePo, 0);
    for (const s of targets) s.factKgs += f.kgs * (f.lineId || base <= 0 ? 1 / targets.length : s.purchasePo / base);
  }
  // расходы поставки: на её машины
  for (const sh of input.shipments) {
    const total = (shipmentFacts.get(sh.id) ?? []).reduce((sum, f) => sum + f.kgs, 0);
    if (!total) continue;
    const targets = slots.filter((s) => s.unitId && s.shipmentId === sh.id);
    if (!targets.length) continue;
    const base = targets.reduce((sum, s) => sum + s.purchaseKgs, 0);
    for (const s of targets) {
      if (sh.method === "manual") s.factKgs += Number(unitById.get(s.unitId!)?.manual ?? 0);
      else s.factKgs += total * (sh.method === "equal" || base <= 0 ? 1 / targets.length : s.purchaseKgs / base);
    }
  }
  return slots;
}

/** Итог по машине для записи в базу (сом, minor, целые). */
export function unitResults(slots: ReturnType<typeof computeOrder>) {
  return slots.filter((s) => s.unitId).map((s) => ({ unitId: s.unitId!, legacy: !s.lineId, purchase: Math.round(s.purchaseKgs), fact: Math.round(s.factKgs) }));
}
