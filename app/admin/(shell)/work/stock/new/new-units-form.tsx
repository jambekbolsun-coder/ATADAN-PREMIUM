"use client";
import { Fragment, useState, useTransition } from "react";
import { Calculator, ChevronDown, LoaderCircle, Plus, Trash2 } from "lucide-react";
import { createUnitsAction } from "../../../../_lib/stock-actions";
import { Field } from "../../../../_ui/forms";
import { Notice } from "../../../../_ui/ui";

type Model = { slug: string; model: string };
type Calc = { factory: string; customs: string; logistics: string; other: string };
type Row = { key: number; slug: string; vin: string; engine: string; year: string; color: string; location: string; cost: string; calc: Calc | null; more: boolean };
let seq = 0;
const blank = (slug = "", location = "Склад Бишкек"): Row => ({ key: ++seq, slug, vin: "", engine: "", year: "", color: "", location, cost: "", calc: null, more: false });
const num = (v: string) => Number(String(v).replace(/\s/g, "").replace(",", ".")) || 0;
const fmt = (n: number) => Math.round(n).toLocaleString("ru-RU");
const calcSum = (c: Calc) => num(c.factory) + num(c.customs) + num(c.logistics) + num(c.other);
const CALC_FIELDS: [keyof Calc, string][] = [["factory", "Цена завода"], ["customs", "Таможня"], ["logistics", "Логистика"], ["other", "Прочее"]];

/** Приход техники без заказа заводу: несколько машин одной таблицей. Себестоимость в долларах, рядом сразу сомы. */
export function NewUnitsForm({ models, canCost, usdRate }: { models: Model[]; canCost: boolean; usdRate: number }) {
  const [rows, setRows] = useState<Row[]>(() => [blank()]);
  const [rate, setRate] = useState(usdRate ? String(usdRate) : "");
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const set = (key: number, patch: Partial<Row>) => setRows((x) => x.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  const costOf = (r: Row) => (r.calc ? calcSum(r.calc) : num(r.cost));
  const cols = canCost ? 7 : 5;
  return (
    <div className="ax-card">
      {canCost ? (
        <div style={{ maxWidth: 260 }}>
          <Field label="Курс: сомов за 1 $" htmlFor="nu-rate" hint="По умолчанию курс НБКР на сегодня. По нему себестоимость переводится в сомы">
            <input id="nu-rate" className="ax-input num" inputMode="decimal" value={rate} onChange={(e) => setRate(e.target.value)} />
          </Field>
        </div>
      ) : null}
      <div className="ax-table-wrap" style={{ marginBottom: 10 }}>
        <table className="ax-table">
          <thead><tr><th>Модель</th><th>VIN</th><th>№ двигателя</th><th>Где стоит</th>{canCost ? <><th>Себестоимость, $</th><th className="r">≈ в сомах</th></> : null}<th /></tr></thead>
          <tbody>
            {rows.map((r) => (
              <Fragment key={r.key}>
                <tr>
                  <td><select className="ax-input" aria-label="Модель" style={{ minWidth: 150 }} value={r.slug} onChange={(e) => set(r.key, { slug: e.target.value })}><option value="">Выберите</option>{models.map((m) => <option key={m.slug} value={m.slug}>{m.model}</option>)}</select></td>
                  <td><input className="ax-input num" style={{ minWidth: 180 }} aria-label="VIN" value={r.vin} onChange={(e) => set(r.key, { vin: e.target.value.toUpperCase() })} placeholder="LCF…" /></td>
                  <td><input className="ax-input" style={{ minWidth: 110 }} aria-label="Номер двигателя" value={r.engine} onChange={(e) => set(r.key, { engine: e.target.value })} /></td>
                  <td><input className="ax-input" style={{ minWidth: 130 }} aria-label="Где стоит" value={r.location} onChange={(e) => set(r.key, { location: e.target.value })} /></td>
                  {canCost ? (
                    <>
                      <td>
                        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                          <input className="ax-input num" style={{ minWidth: 120 }} aria-label="Себестоимость в долларах" inputMode="decimal" value={r.calc ? fmt(calcSum(r.calc)) : r.cost} readOnly={!!r.calc} onChange={(e) => set(r.key, { cost: e.target.value })} placeholder="из прайса" />
                          <button type="button" className="ax-tap" title="Посчитать: завод + таможня + логистика + прочее" aria-label="Посчитать себестоимость" aria-pressed={!!r.calc} onClick={() => set(r.key, { calc: r.calc ? null : { factory: r.cost, customs: "", logistics: "", other: "" }, cost: r.calc ? String(calcSum(r.calc) || "") : r.cost })} style={r.calc ? { color: "var(--brand)" } : undefined}><Calculator size={17} aria-hidden /></button>
                        </div>
                      </td>
                      <td className="r num ax-small">{costOf(r) && num(rate) ? `${fmt(costOf(r) * num(rate))} с` : ""}</td>
                    </>
                  ) : null}
                  <td style={{ whiteSpace: "nowrap" }}>
                    <button type="button" className="ax-tap" aria-label="Год и цвет" title="Год и цвет (необязательно)" aria-expanded={r.more} onClick={() => set(r.key, { more: !r.more })}><ChevronDown size={17} aria-hidden style={{ transform: r.more ? "rotate(180deg)" : undefined }} /></button>
                    {rows.length > 1 ? <button type="button" className="ax-tap" aria-label="Убрать строку" onClick={() => setRows((x) => x.filter((y) => y.key !== r.key))}><Trash2 size={17} aria-hidden /></button> : null}
                  </td>
                </tr>
                {r.calc && canCost ? (
                  <tr>
                    <td colSpan={cols} style={{ background: "var(--surface-2)" }}>
                      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
                        {CALC_FIELDS.map(([k, label]) => (
                          <label key={k} style={{ display: "grid", gap: 4, fontSize: 12.5 }} className="ax-small">{label}, $
                            <input className="ax-input num" style={{ width: 130 }} inputMode="decimal" value={r.calc![k]} onChange={(e) => set(r.key, { calc: { ...r.calc!, [k]: e.target.value } })} />
                          </label>
                        ))}
                        <span className="ax-strong num" style={{ paddingBottom: 10 }}>= {fmt(calcSum(r.calc))} $</span>
                      </div>
                    </td>
                  </tr>
                ) : null}
                {r.more ? (
                  <tr>
                    <td colSpan={cols} style={{ background: "var(--surface-2)" }}>
                      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                        <label className="ax-small" style={{ display: "grid", gap: 4 }}>Год выпуска
                          <input className="ax-input num" style={{ width: 110 }} inputMode="numeric" value={r.year} placeholder={String(new Date().getFullYear())} onChange={(e) => set(r.key, { year: e.target.value })} />
                        </label>
                        <label className="ax-small" style={{ display: "grid", gap: 4 }}>Цвет
                          <input className="ax-input" style={{ width: 160 }} value={r.color} onChange={(e) => set(r.key, { color: e.target.value })} />
                        </label>
                      </div>
                    </td>
                  </tr>
                ) : null}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
      <button type="button" className="ax-btn" onClick={() => setRows((x) => [...x, blank(x[x.length - 1]?.slug ?? "", x[x.length - 1]?.location ?? "Склад Бишкек")])}><Plus size={16} aria-hidden />Ещё машина</button>
      <p className="ax-small">VIN проверяется на повторы. Себестоимость можно ввести одной суммой или посчитать кнопкой с калькулятором: завод + таможня + логистика + прочее. Если не указана, берётся себестоимость модели из «Прайса и себестоимости». Цена продажи задаётся там же, в прайсе. Год и цвет необязательны: стрелка справа.</p>
      {error ? <div style={{ marginBottom: 10 }}><Notice tone="bad">{error}</Notice></div> : null}
      <button
        type="button"
        className="ax-btn ax-btn-primary"
        disabled={pending}
        onClick={() => {
          setError("");
          if (rows.some((r) => !r.slug)) return setError("Выберите модель в каждой строке");
          if (rows.some((r) => r.vin.trim().length < 6)) return setError("Укажите VIN в каждой строке (минимум 6 символов)");
          if (canCost && rows.some((r) => costOf(r) > 0) && !(num(rate) > 0)) return setError("Укажите курс доллара");
          start(async () => {
            const res = await createUnitsAction({
              fxRate: rate,
              rows: rows.map((r) => ({
                slug: r.slug, vin: r.vin, engine: r.engine, year: r.year, color: r.color, location: r.location,
                costUsd: canCost && costOf(r) ? String(costOf(r)) : "",
                breakdown: r.calc ? CALC_FIELDS.filter(([k]) => num(r.calc![k])).map(([k, label]) => `${label.toLowerCase()} ${fmt(num(r.calc![k]))}`).join(", ") : "",
              })),
            });
            if (res && !res.ok) setError(res.error ?? "Не удалось сохранить");
          });
        }}
      >
        {pending ? <LoaderCircle size={17} className="ax-spin" aria-hidden /> : null}Поставить на склад ({rows.length})
      </button>
    </div>
  );
}
