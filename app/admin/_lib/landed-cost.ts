/**
 * Себестоимость техники по заказу заводу: расчёт как в Excel владельца, план и факт.
 *
 * Себестоимость машины = цена завода (EXW) × курс заказа + статьи расходов:
 * пошлина, транспорт, НДС, таможенные сборы, налоги, брокер, СВХ и прочее.
 *
 * По каждой статье берётся ФАКТ, если по ней внесён хотя бы один расход, который касается машины,
 * иначе ПЛАН из калькуляции заказа (сумма на одну машину модели). Так себестоимость видна сразу
 * после заказа и сама уточняется, когда приходят настоящие счета.
 *
 * Факт распределяется по «местам» заказа: место = одна заказанная машина (кол-во в позиции).
 * Отгруженная машина занимает место своей позиции, ещё не отгруженные места остаются пустыми,
 * поэтому расход на весь заказ не ложится целиком на первую поставку.
 *  - расход на весь заказ: по местам пропорционально цене завода;
 *  - расход на модель: поровну на места этой позиции;
 *  - расход поставки: на её машины способом поставки (по цене / поровну / вручную).
 *
 * Модуль чистый (без базы): его считают и сервер при пересчёте, и тесты.
 */

export const COST_ITEMS: { key: string; label: string; short: string }[] = [
  { key: "duty", label: "Таможенная пошлина", short: "Пошлина" },
  { key: "freight", label: "Транспорт (фрахт)", short: "Транспорт" },
  { key: "vat", label: "НДС на импорт", short: "НДС" },
  { key: "customs_fee", label: "Таможенные сборы", short: "Таможенные сборы" },
  { key: "tax", label: "Налоги", short: "Налоги" },
  { key: "broker", label: "Брокерские услуги", short: "Брокер" },
  { key: "storage", label: "Расходы по СВХ (хранение)", short: "СВХ" },
  { key: "certification", label: "Сертификация", short: "Сертификация" },
  { key: "unloading", label: "Разгрузка", short: "Разгрузка" },
  { key: "other", label: "Другое", short: "Другое" },
];
export const COST_KEYS = COST_ITEMS.map((c) => c.key);
export const COST_LABEL: Record<string, string> = Object.fromEntries(COST_ITEMS.map((c) => [c.key, c.label]));

export type CalcLine = { id: string; qty: number; /** цена завода за 1 шт. в валюте заказа, minor */ price: number };
export type CalcPlan = { lineId: string; category: string; /** на 1 машину, в валюте заказа, minor */ perUnit: number };
export type CalcFact = { category: string; kgs: number; /** та же сумма в валюте заказа, minor */ po: number; lineId: string | null; shipmentId: string | null };
export type CalcUnit = { id: string; lineId: string | null; shipmentId: string | null; /** закупка старых машин без позиции заказа, сом minor */ legacyKgs: number; /** ручная доля расходов поставки, сом minor */ manual: number | null };
export type CalcShipment = { id: string; method: string };
export type CostPart = { kgs: number; po: number; source: "plan" | "fact" };
/** В позиции часть машин может быть уже по факту, часть ещё по плану. */
export type LinePart = { kgs: number; po: number; source: "plan" | "fact" | "mixed" };

export type Slot = {
  unitId: string | null;
  lineId: string | null;
  shipmentId: string | null;
  purchaseKgs: number;
  purchasePo: number;
  items: Record<string, CostPart>;
  factKgs: number;
  planKgs: number;
};
export type LineCalc = {
  lineId: string;
  /** средние значения на одну машину позиции */
  purchasePo: number;
  purchaseKgs: number;
  items: Record<string, LinePart>;
  totalPo: number;
  totalKgs: number;
  /** есть ли в позиции статьи, посчитанные по плану */
  hasPlan: boolean;
};

const add = (slot: Slot, category: string, kgs: number, po: number) => {
  const cur = slot.items[category];
  if (cur && cur.source === "fact") { cur.kgs += kgs; cur.po += po; }
  else slot.items[category] = { kgs, po, source: "fact" };
};

export function computeOrder(input: { rate: number; lines: CalcLine[]; plan: CalcPlan[]; facts: CalcFact[]; units: CalcUnit[]; shipments: CalcShipment[] }) {
  const rate = input.rate > 0 ? input.rate : 1;
  const lineById = new Map(input.lines.map((l) => [l.id, l]));
  const slots: Slot[] = [];
  const newSlot = (p: Omit<Slot, "items" | "factKgs" | "planKgs">): Slot => ({ ...p, items: {}, factKgs: 0, planKgs: 0 });

  // 1. места: отгруженные машины занимают места своих позиций, остальные места пустые
  for (const line of input.lines) {
    const units = input.units.filter((u) => u.lineId === line.id);
    for (const u of units) slots.push(newSlot({ unitId: u.id, lineId: line.id, shipmentId: u.shipmentId, purchaseKgs: line.price * rate, purchasePo: line.price }));
    for (let i = units.length; i < line.qty; i += 1) slots.push(newSlot({ unitId: null, lineId: line.id, shipmentId: null, purchaseKgs: line.price * rate, purchasePo: line.price }));
  }
  for (const u of input.units) {
    if (u.lineId && lineById.has(u.lineId)) continue;
    slots.push(newSlot({ unitId: u.id, lineId: null, shipmentId: u.shipmentId, purchaseKgs: u.legacyKgs, purchasePo: u.legacyKgs / rate }));
  }
  const unitById = new Map(input.units.map((u) => [u.id, u]));

  // 2. факт
  const shipmentFacts = new Map<string, CalcFact[]>();
  for (const f of input.facts) {
    if (f.shipmentId) { shipmentFacts.set(f.shipmentId, [...(shipmentFacts.get(f.shipmentId) ?? []), f]); continue; }
    const targets = f.lineId ? slots.filter((s) => s.lineId === f.lineId) : slots;
    if (!targets.length) continue;
    const base = targets.reduce((sum, s) => sum + s.purchasePo, 0);
    for (const s of targets) {
      const w = f.lineId || base <= 0 ? 1 / targets.length : s.purchasePo / base;
      add(s, f.category, f.kgs * w, f.po * w);
    }
  }
  for (const sh of input.shipments) {
    const facts = shipmentFacts.get(sh.id);
    if (!facts?.length) continue;
    const targets = slots.filter((s) => s.unitId && s.shipmentId === sh.id);
    if (!targets.length) continue;
    const totalKgs = facts.reduce((sum, f) => sum + f.kgs, 0);
    const base = targets.reduce((sum, s) => sum + s.purchaseKgs, 0);
    for (const s of targets) {
      for (const f of facts) {
        let w: number;
        if (sh.method === "manual") w = totalKgs > 0 ? (Number(unitById.get(s.unitId!)?.manual ?? 0) / totalKgs) : 0;
        else if (sh.method === "equal" || base <= 0) w = 1 / targets.length;
        else w = s.purchaseKgs / base;
        add(s, f.category, f.kgs * w, f.po * w);
      }
    }
  }

  // 3. план там, где по статье нет факта
  const planByLine = new Map<string, CalcPlan[]>();
  for (const p of input.plan) if (p.perUnit > 0) planByLine.set(p.lineId, [...(planByLine.get(p.lineId) ?? []), p]);
  for (const s of slots) {
    for (const p of (s.lineId && planByLine.get(s.lineId)) || []) {
      if (s.items[p.category]) continue;
      s.items[p.category] = { kgs: p.perUnit * rate, po: p.perUnit, source: "plan" };
    }
    for (const part of Object.values(s.items)) {
      if (part.source === "fact") s.factKgs += part.kgs;
      else s.planKgs += part.kgs;
    }
  }

  // 4. по позициям: среднее на одну машину
  const lines: LineCalc[] = input.lines.map((line) => {
    const own = slots.filter((s) => s.lineId === line.id);
    const n = own.length || 1;
    const items: Record<string, LinePart> = {};
    let hasPlan = false;
    for (const key of new Set(own.flatMap((s) => Object.keys(s.items)))) {
      const parts = own.map((s) => s.items[key]).filter(Boolean);
      const facts = parts.filter((p) => p.source === "fact").length;
      if (facts < parts.length) hasPlan = true;
      items[key] = { kgs: parts.reduce((a, p) => a + p.kgs, 0) / n, po: parts.reduce((a, p) => a + p.po, 0) / n, source: facts === parts.length ? "fact" : facts ? "mixed" : "plan" };
    }
    const extraPo = Object.values(items).reduce((a, p) => a + p.po, 0);
    const extraKgs = Object.values(items).reduce((a, p) => a + p.kgs, 0);
    return { lineId: line.id, purchasePo: line.price, purchaseKgs: line.price * rate, items, totalPo: line.price + extraPo, totalKgs: line.price * rate + extraKgs, hasPlan };
  });

  return { slots, lines };
}

/** Итог по машине для записи в базу (сом, minor, целые). */
export function unitResults(slots: Slot[]) {
  return slots.filter((s) => s.unitId).map((s) => ({
    unitId: s.unitId!,
    legacy: !s.lineId,
    purchase: Math.round(s.purchaseKgs),
    fact: Math.round(s.factKgs),
    plan: Math.round(s.planKgs),
  }));
}

/** График оплаты заводу: «Оплата 1 20%, Оплата 2 80%» → суммы и сколько каждой уже покрыто оплатами. */
export function paymentPlan(schedule: { label: string; percent: number }[], total: number, paid: number) {
  let left = paid;
  return schedule.map((s, i) => {
    const amount = Math.round((total * s.percent) / 100);
    const covered = Math.max(0, Math.min(amount, left));
    left -= covered;
    return { label: s.label || `Оплата ${i + 1}`, percent: s.percent, amount, covered, done: amount > 0 && covered >= amount };
  });
}
