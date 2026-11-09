"use client";
import { useState, useTransition } from "react";
import { LoaderCircle, Plus, Trash2 } from "lucide-react";
import { createUnitsAction } from "../../../../_lib/stock-actions";
import { Notice } from "../../../../_ui/ui";

type Model = { slug: string; model: string };
type Row = { key: number; slug: string; vin: string; engine: string; year: string; color: string; location: string; cost: string; price: string };
let seq = 0;
const blank = (slug = "", location = "Склад Бишкек"): Row => ({ key: ++seq, slug, vin: "", engine: "", year: String(new Date().getFullYear()), color: "", location, cost: "", price: "" });

/** Приход техники без заказа заводу: несколько машин одной таблицей. */
export function NewUnitsForm({ models, canCost }: { models: Model[]; canCost: boolean }) {
  const [rows, setRows] = useState<Row[]>(() => [blank()]);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const set = (key: number, patch: Partial<Row>) => setRows((x) => x.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  return (
    <div className="ax-card">
      <div className="ax-table-wrap" style={{ marginBottom: 10 }}>
        <table className="ax-table">
          <thead><tr><th>Модель</th><th>VIN</th><th>№ двигателя</th><th style={{ width: 84 }}>Год</th><th>Цвет</th><th>Где стоит</th>{canCost ? <th>Себестоимость, сом</th> : null}<th>Своя цена, сом</th><th /></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.key}>
                <td><select className="ax-input" aria-label="Модель" style={{ minWidth: 150 }} value={r.slug} onChange={(e) => set(r.key, { slug: e.target.value })}><option value="">Выберите</option>{models.map((m) => <option key={m.slug} value={m.slug}>{m.model}</option>)}</select></td>
                <td><input className="ax-input num" style={{ minWidth: 170 }} aria-label="VIN" value={r.vin} onChange={(e) => set(r.key, { vin: e.target.value.toUpperCase() })} placeholder="LCF…" /></td>
                <td><input className="ax-input" style={{ minWidth: 110 }} aria-label="Номер двигателя" value={r.engine} onChange={(e) => set(r.key, { engine: e.target.value })} /></td>
                <td><input className="ax-input num" aria-label="Год" inputMode="numeric" value={r.year} onChange={(e) => set(r.key, { year: e.target.value })} /></td>
                <td><input className="ax-input" style={{ minWidth: 90 }} aria-label="Цвет" value={r.color} onChange={(e) => set(r.key, { color: e.target.value })} /></td>
                <td><input className="ax-input" style={{ minWidth: 120 }} aria-label="Где стоит" value={r.location} onChange={(e) => set(r.key, { location: e.target.value })} /></td>
                {canCost ? <td><input className="ax-input num" style={{ minWidth: 120 }} aria-label="Себестоимость" inputMode="numeric" value={r.cost} onChange={(e) => set(r.key, { cost: e.target.value })} placeholder="из прайса" /></td> : null}
                <td><input className="ax-input num" style={{ minWidth: 110 }} aria-label="Своя цена" inputMode="numeric" value={r.price} onChange={(e) => set(r.key, { price: e.target.value })} placeholder="из прайса" /></td>
                <td>{rows.length > 1 ? <button type="button" className="ax-tap" aria-label="Убрать строку" onClick={() => setRows((x) => x.filter((y) => y.key !== r.key))}><Trash2 size={17} aria-hidden /></button> : null}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button type="button" className="ax-btn" onClick={() => setRows((x) => [...x, blank(x[x.length - 1]?.slug ?? "", x[x.length - 1]?.location ?? "Склад Бишкек")])}><Plus size={16} aria-hidden />Ещё машина</button>
      <p className="ax-small">VIN проверяется на повторы. Если себестоимость или цена не указаны, берутся значения модели из «Прайса и себестоимости».</p>
      {error ? <div style={{ marginBottom: 10 }}><Notice tone="bad">{error}</Notice></div> : null}
      <button
        type="button"
        className="ax-btn ax-btn-primary"
        disabled={pending}
        onClick={() => {
          setError("");
          if (rows.some((r) => !r.slug)) return setError("Выберите модель в каждой строке");
          if (rows.some((r) => r.vin.trim().length < 6)) return setError("Укажите VIN в каждой строке (минимум 6 символов)");
          start(async () => {
            const res = await createUnitsAction(rows.map(({ slug, vin, engine, year, color, location, cost, price }) => ({ slug, vin, engine, year, color, location, cost, price })));
            if (res && !res.ok) setError(res.error ?? "Не удалось сохранить");
          });
        }}
      >
        {pending ? <LoaderCircle size={17} className="ax-spin" aria-hidden /> : null}Поставить на склад ({rows.length})
      </button>
    </div>
  );
}
