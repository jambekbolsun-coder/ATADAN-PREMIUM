"use server";
/** Серверные действия склада, логистики и кассы. Каждое проверяет вход и права в своей операции. */
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { HttpError } from "../../lib/security";
import { requireStaff } from "./session";
import * as stock from "./stock";
import * as money from "./money";
import * as catalog from "./catalog-admin";
import type { ActionResult } from "./sales-actions";

async function run(work: () => Promise<unknown>, success: string, paths: string[]): Promise<ActionResult> {
  try {
    await work();
  } catch (error) {
    if (error instanceof HttpError) return { ok: false, error: error.message };
    const code = (error as { code?: string })?.code;
    if (code === "23505") return { ok: false, error: "Такая запись уже есть (номер, VIN или название). Проверьте и повторите" };
    console.error("[admin/stock] action failed", error);
    return { ok: false, error: "Не удалось сохранить. Обновите страницу и повторите" };
  }
  for (const p of paths) revalidatePath(p);
  revalidatePath("/admin", "layout");
  return { ok: true, message: success };
}
const f = (form: FormData, key: string) => String(form.get(key) ?? "");

// ── заказы заводу и поставки
export async function createSupplierAction(_p: ActionResult | null, form: FormData): Promise<ActionResult> {
  const actor = await requireStaff();
  return run(() => stock.createSupplier(actor, { name: f(form, "name"), country: f(form, "country"), contact: f(form, "contact"), phone: f(form, "phone"), terms: f(form, "terms") }), "Поставщик добавлен", ["/admin/work/logistics"]);
}

export async function createOrderAction(payload: Parameters<typeof stock.createOrder>[1]): Promise<ActionResult> {
  const actor = await requireStaff();
  let poId = "";
  const r = await run(async () => { poId = await stock.createOrder(actor, payload); }, "Заказ создан", ["/admin/work/logistics"]);
  if (r.ok) redirect(`/admin/work/logistics/orders/${poId}`);
  return r;
}

export async function supplierPaymentAction(poId: string, _p: ActionResult | null, form: FormData): Promise<ActionResult> {
  const actor = await requireStaff();
  return run(() => stock.addSupplierPayment(actor, poId, { accountId: f(form, "accountId"), amount: f(form, "amount"), fxRate: f(form, "fxRate"), amountPo: f(form, "amountPo"), paidAt: f(form, "paidAt"), note: f(form, "note") }), "Оплата заводу проведена", [`/admin/work/logistics/orders/${poId}`, "/admin/work/cash"]);
}

export async function voidSupplierPaymentAction(poId: string, paymentId: string, _p: ActionResult | null, form: FormData): Promise<ActionResult> {
  const actor = await requireStaff();
  return run(() => stock.voidSupplierPayment(actor, paymentId, f(form, "reason")), "Оплата сторнирована", [`/admin/work/logistics/orders/${poId}`, "/admin/work/cash"]);
}

export async function createShipmentAction(payload: Parameters<typeof stock.createShipment>[1]): Promise<ActionResult> {
  const actor = await requireStaff();
  let sid = "";
  const r = await run(async () => { sid = await stock.createShipment(actor, payload); }, "Поставка создана", ["/admin/work/logistics", "/admin/work/stock"]);
  if (r.ok) redirect(`/admin/work/logistics/shipments/${sid}`);
  return r;
}

export async function advanceShipmentAction(shipmentId: string, to: string): Promise<ActionResult> {
  const actor = await requireStaff();
  return run(() => stock.advanceShipment(actor, shipmentId, to), "Этап поставки отмечен", [`/admin/work/logistics/shipments/${shipmentId}`, "/admin/work/logistics", "/admin/work/stock"]);
}

export async function receiveShipmentAction(shipmentId: string, _p: ActionResult | null, form: FormData): Promise<ActionResult> {
  const actor = await requireStaff();
  return run(() => stock.receiveShipment(actor, shipmentId, form.getAll("unitId").map(String), f(form, "location")), "Машины приняты на склад, себестоимость посчитана", [`/admin/work/logistics/shipments/${shipmentId}`, "/admin/work/stock", "/admin/work/logistics"]);
}

export async function shipmentCostAction(shipmentId: string, _p: ActionResult | null, form: FormData): Promise<ActionResult> {
  const actor = await requireStaff();
  return run(() => stock.addShipmentCost(actor, shipmentId, { category: f(form, "category"), currency: f(form, "currency"), amount: f(form, "amount"), fxRate: f(form, "fxRate"), accountId: f(form, "accountId"), paidAt: f(form, "paidAt"), note: f(form, "note") }), "Расход добавлен, себестоимость пересчитана", [`/admin/work/logistics/shipments/${shipmentId}`, "/admin/work/cash"]);
}

export async function voidShipmentCostAction(shipmentId: string, costId: string, _p: ActionResult | null, form: FormData): Promise<ActionResult> {
  const actor = await requireStaff();
  return run(() => stock.voidShipmentCost(actor, costId, f(form, "reason")), "Расход сторнирован", [`/admin/work/logistics/shipments/${shipmentId}`, "/admin/work/cash"]);
}

export async function allocationAction(shipmentId: string, _p: ActionResult | null, form: FormData): Promise<ActionResult> {
  const actor = await requireStaff();
  const manual: Record<string, string> = {};
  for (const [k, v] of form.entries()) if (k.startsWith("manual:")) manual[k.slice(7)] = String(v);
  return run(() => stock.setAllocation(actor, shipmentId, f(form, "method"), manual), "Распределение сохранено", [`/admin/work/logistics/shipments/${shipmentId}`]);
}

// ── машина
export async function updateUnitAction(unitId: string, _p: ActionResult | null, form: FormData): Promise<ActionResult> {
  const actor = await requireStaff();
  return run(() => stock.updateUnit(actor, unitId, { engine: f(form, "engine"), year: f(form, "year"), color: f(form, "color"), gtd: f(form, "gtd"), certificate: f(form, "certificate"), passport: f(form, "passport"), location: f(form, "location"), listPrice: f(form, "listPrice"), vin: f(form, "vin"), slug: f(form, "slug") }), "Данные машины сохранены", [`/admin/work/stock/${unitId}`, "/admin/work/stock"]);
}
export async function shipmentInfoAction(shipmentId: string, _p: ActionResult | null, form: FormData): Promise<ActionResult> {
  const actor = await requireStaff();
  return run(() => stock.setShipmentInfo(actor, shipmentId, { route: f(form, "route"), transport: f(form, "transport"), origin: f(form, "origin"), destination: f(form, "destination"), carrier: f(form, "carrier"), driverName: f(form, "driverName"), driverPhone: f(form, "driverPhone"), departure: f(form, "departure"), eta: f(form, "eta") }), "Сохранено", ["/admin/work/logistics", `/admin/work/logistics/shipments/${shipmentId}`]);
}
export async function unitCostAction(unitId: string, _p: ActionResult | null, form: FormData): Promise<ActionResult> {
  const actor = await requireStaff();
  return run(() => stock.setUnitCost(actor, unitId, f(form, "cost")), "Себестоимость сохранена", ["/admin/work/stock", `/admin/work/stock/${unitId}`, "/admin/work/margin"]);
}
export async function createUnitsAction(rows: { slug: string; vin: string; engine?: string; year?: string; color?: string; location?: string; cost?: string; price?: string }[]): Promise<ActionResult> {
  const actor = await requireStaff();
  const r = await run(() => stock.createUnits(actor, rows), "Машины поставлены на склад", ["/admin/work/stock", "/admin/marketing/catalog", "/"]);
  if (r.ok) redirect("/admin/work/stock");
  return r;
}
export async function savePricesAction(rows: catalog.PriceChange[], note: string): Promise<ActionResult> {
  const actor = await requireStaff();
  const r = await run(() => catalog.savePrices(actor, rows, note), "Прайс сохранён", ["/admin/work/prices", "/admin/marketing/catalog"]);
  if (r.ok) revalidatePath("/", "layout");
  return r;
}
export async function pdiAction(unitId: string): Promise<ActionResult> {
  const actor = await requireStaff();
  return run(() => stock.markPdi(actor, unitId), "PDI отмечен", [`/admin/work/stock/${unitId}`, "/admin/work/stock"]);
}
export async function damageAction(unitId: string, _p: ActionResult | null, form: FormData): Promise<ActionResult> {
  const actor = await requireStaff();
  return run(() => stock.setDamage(actor, unitId, f(form, "note")), "Сохранено", [`/admin/work/stock/${unitId}`]);
}
export async function writeOffAction(unitId: string, _p: ActionResult | null, form: FormData): Promise<ActionResult> {
  const actor = await requireStaff();
  return run(() => stock.writeOff(actor, unitId, f(form, "reason")), "Машина списана", [`/admin/work/stock/${unitId}`, "/admin/work/stock"]);
}

// ── касса
export async function movementAction(_p: ActionResult | null, form: FormData): Promise<ActionResult> {
  const actor = await requireStaff();
  const direction = f(form, "direction") === "in" ? "in" : "out";
  return run(() => money.addMovement(actor, { direction, accountId: f(form, "accountId"), amount: f(form, "amount"), category: f(form, "category"), date: f(form, "date"), description: f(form, "description"), counterparty: f(form, "counterparty"), allowNegative: f(form, "allowNegative") === "on" }), direction === "in" ? "Приход записан" : "Расход записан", ["/admin/work/cash", "/admin/work/expenses"]);
}
export async function transferAction(_p: ActionResult | null, form: FormData): Promise<ActionResult> {
  const actor = await requireStaff();
  return run(() => money.transfer(actor, { fromId: f(form, "fromId"), toId: f(form, "toId"), amount: f(form, "amount"), received: f(form, "received"), date: f(form, "date"), note: f(form, "note") }), "Перевод проведён", ["/admin/work/cash"]);
}
export async function reverseAction(txId: string, _p: ActionResult | null, form: FormData): Promise<ActionResult> {
  const actor = await requireStaff();
  return run(() => money.reverseMovement(actor, txId, f(form, "reason")), "Проводка сторнирована", ["/admin/work/cash", "/admin/work/expenses"]);
}
export async function createAccountAction(_p: ActionResult | null, form: FormData): Promise<ActionResult> {
  const actor = await requireStaff();
  return run(() => money.createAccount(actor, { name: f(form, "name"), type: f(form, "type"), currency: f(form, "currency"), opening: f(form, "opening") }), "Касса добавлена", ["/admin/work/cash"]);
}
