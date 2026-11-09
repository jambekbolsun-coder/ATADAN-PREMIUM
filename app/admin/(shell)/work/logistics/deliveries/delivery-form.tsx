"use client";
import { useState, useTransition } from "react";
import { LoaderCircle, Plus, Trash2 } from "lucide-react";
import { saveDeliveryAction } from "../../../../_lib/deliveries-actions";
import { Field } from "../../../../_ui/forms";

type Line = { key: number; slug: string; qty: string; vin: string };
export type DeliveryFormValue = {
  kind: string; clientName: string; clientPhone: string; saleId: string; customerId: string; fromPlace: string; toPlace: string; plannedAt: string;
  carrier: string; driverName: string; driverPhone: string; vehicle: string; cost: string; note: string; items: { slug: string; qty: string; vin: string }[];
};

let seq = 0;

export function DeliveryForm({ initial, kinds, models, deliveryId, costLocked }: { initial: DeliveryFormValue; kinds: Record<string, string>; models: { slug: string; model: string }[]; deliveryId?: string; costLocked?: boolean }) {
  const [v, setV] = useState(initial);
  const set = <K extends keyof DeliveryFormValue>(k: K, val: DeliveryFormValue[K]) => setV((x) => ({ ...x, [k]: val }));
  const [lines, setLines] = useState<Line[]>(() => (initial.items.length ? initial.items : [{ slug: "", qty: "1", vin: "" }]).map((i) => ({ ...i, key: ++seq })));
  const edit = (key: number, patch: Partial<Line>) => setLines((x) => x.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const client = v.kind === "to_client";

  function submit() {
    setError("");
    start(async () => {
      const r = await saveDeliveryAction({ ...v, items: lines.map(({ slug, qty, vin }) => ({ slug, qty, vin })) }, deliveryId);
      if (r && !r.ok) setError(r.error ?? "Не удалось сохранить");
    });
  }

  return (
    <div className="ax-grid" style={{ gap: 14 }}>
      <section className="ax-card">
        <h3 className="ax-card-h">Кому</h3>
        <div className="ax-grid ax-g2" style={{ gap: 12 }}>
          <Field label="Тип перевозки" htmlFor="dl-kind"><select id="dl-kind" className="ax-input" value={v.kind} onChange={(e) => set("kind", e.target.value)}>{Object.entries(kinds).map(([k, label]) => <option key={k} value={k}>{label}</option>)}</select></Field>
          <span />
          <Field label={client ? "ФИО клиента" : "Получатель"} htmlFor="dl-name"><input id="dl-name" className="ax-input" value={v.clientName} onChange={(e) => set("clientName", e.target.value)} /></Field>
          <Field label="Телефон" htmlFor="dl-phone"><input id="dl-phone" className="ax-input" inputMode="tel" value={v.clientPhone} onChange={(e) => set("clientPhone", e.target.value)} placeholder="+996 555 12 34 56" /></Field>
        </div>
      </section>

      <section className="ax-card">
        <h3 className="ax-card-h">Маршрут и время</h3>
        <div className="ax-grid ax-g2" style={{ gap: 12 }}>
          <Field label="Откуда" htmlFor="dl-from"><input id="dl-from" className="ax-input" value={v.fromPlace} onChange={(e) => set("fromPlace", e.target.value)} placeholder="Склад, Бишкек" /></Field>
          <Field label="Куда" htmlFor="dl-to"><input id="dl-to" className="ax-input" value={v.toPlace} onChange={(e) => set("toPlace", e.target.value)} placeholder="с. Кара-Балта, ул. Ленина 5" /></Field>
          <Field label="Дата и время" htmlFor="dl-when"><input id="dl-when" type="datetime-local" className="ax-input" value={v.plannedAt} onChange={(e) => set("plannedAt", e.target.value)} /></Field>
        </div>
      </section>

      <section className="ax-card">
        <h3 className="ax-card-h">Какие модели</h3>
        <div style={{ display: "grid", gap: 8 }}>
          {lines.map((l) => (
            <div key={l.key} style={{ display: "grid", gridTemplateColumns: "minmax(0,2fr) 72px minmax(0,1.3fr) auto", gap: 6 }}>
              <select className="ax-input" aria-label="Модель" value={l.slug} onChange={(e) => edit(l.key, { slug: e.target.value })}><option value="">Выберите модель</option>{models.map((m) => <option key={m.slug} value={m.slug}>{m.model}</option>)}</select>
              <input className="ax-input num" aria-label="Количество" inputMode="numeric" value={l.qty} onChange={(e) => edit(l.key, { qty: e.target.value })} />
              <input className="ax-input num" aria-label="VIN" placeholder="VIN (если есть)" value={l.vin} onChange={(e) => edit(l.key, { vin: e.target.value })} />
              <button type="button" className="ax-tap" aria-label="Убрать строку" disabled={lines.length < 2} onClick={() => setLines((x) => x.filter((y) => y.key !== l.key))}><Trash2 size={16} aria-hidden /></button>
            </div>
          ))}
        </div>
        <button type="button" className="ax-btn ax-btn-sm" style={{ marginTop: 8 }} onClick={() => setLines((x) => [...x, { key: ++seq, slug: "", qty: "1", vin: "" }])}><Plus size={15} aria-hidden />Ещё модель</button>
      </section>

      <section className="ax-card">
        <h3 className="ax-card-h">Кто везёт</h3>
        <div className="ax-grid ax-g2" style={{ gap: 12 }}>
          <Field label="Перевозчик" htmlFor="dl-car"><input id="dl-car" className="ax-input" value={v.carrier} onChange={(e) => set("carrier", e.target.value)} /></Field>
          <Field label="Транспорт и госномер" htmlFor="dl-veh"><input id="dl-veh" className="ax-input" value={v.vehicle} onChange={(e) => set("vehicle", e.target.value)} /></Field>
          <Field label="Водитель" htmlFor="dl-drv"><input id="dl-drv" className="ax-input" value={v.driverName} onChange={(e) => set("driverName", e.target.value)} /></Field>
          <Field label="Телефон водителя" htmlFor="dl-drvp"><input id="dl-drvp" className="ax-input" inputMode="tel" value={v.driverPhone} onChange={(e) => set("driverPhone", e.target.value)} /></Field>
          <Field label="Стоимость, сом" htmlFor="dl-cost" hint={costLocked ? "Уже оплачено: сначала сторнируйте оплату" : "Запись в кассу делается в карточке перевозки"}><input id="dl-cost" className="ax-input num" inputMode="decimal" disabled={costLocked} value={v.cost} onChange={(e) => set("cost", e.target.value)} /></Field>
        </div>
        <Field label="Комментарий" htmlFor="dl-note"><textarea id="dl-note" className="ax-input" rows={2} value={v.note} onChange={(e) => set("note", e.target.value)} /></Field>
      </section>

      {error ? <div className="ax-error" role="alert">{error}</div> : null}
      <div className="ax-sticky-actions"><button type="button" className="ax-btn ax-btn-primary" disabled={pending} onClick={submit}>{pending ? <LoaderCircle size={17} className="ax-spin" aria-hidden /> : null}Сохранить перевозку</button></div>
    </div>
  );
}
