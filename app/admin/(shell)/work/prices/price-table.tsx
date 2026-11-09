"use client";
import { useMemo, useState, useTransition } from "react";
import { LoaderCircle, Percent, Search } from "lucide-react";
import { savePricesAction } from "../../../_lib/stock-actions";
import { Toast } from "../../../_ui/forms";

export type PriceRow = { slug: string; model: string; hp: number; price: string; usd: string; usdHint: number; discount: string; cost: string; onRequest: boolean; stock: number; status: string };

/** Прайс одной таблицей: меняете нужные ячейки и сохраняете всё разом. */
export function PriceTable({ rows, canPrice, canCost }: { rows: PriceRow[]; canPrice: boolean; canCost: boolean }) {
  const initial = useMemo(() => new Map(rows.map((r) => [r.slug, r])), [rows]);
  const [data, setData] = useState(rows);
  const [q, setQ] = useState("");
  const [percent, setPercent] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [pending, start] = useTransition();
  const set = (slug: string, patch: Partial<PriceRow>) => setData((x) => x.map((r) => (r.slug === slug ? { ...r, ...patch } : r)));
  const changed = data.filter((r) => { const o = initial.get(r.slug)!; return o.price !== r.price || o.usd !== r.usd || o.discount !== r.discount || o.cost !== r.cost || o.onRequest !== r.onRequest; });
  const visible = data.filter((r) => !q.trim() || r.model.toLowerCase().includes(q.trim().toLowerCase()) || String(r.hp) === q.trim());

  function applyPercent() {
    const k = Number(percent.replace(",", "."));
    if (!Number.isFinite(k) || k <= -90 || k > 500 || !k) return setError("Укажите процент, например 5 или -3");
    setError("");
    const slugs = new Set(visible.map((r) => r.slug));
    const up = (v: string) => (v ? String(Math.round(Number(v) * (1 + k / 100))) : v);
    setData((x) => x.map((r) => (slugs.has(r.slug) ? { ...r, price: up(r.price), usd: up(r.usd) } : r)));
    setPercent("");
  }
  function save() {
    setError("");
    start(async () => {
      const r = await savePricesAction(changed.map((c) => ({ slug: c.slug, price: c.price, usd: c.usd, discount: c.discount, cost: c.cost, onRequest: c.onRequest })), note);
      if (!r.ok) setError(r.error ?? "Не удалось сохранить");
      else { setToast(r.message ?? "Сохранено"); setNote(""); }
    });
  }

  return (
    <>
      <div className="ax-card" style={{ marginBottom: 12, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ position: "relative", flex: "1 1 200px", maxWidth: 280 }}>
          <Search size={15} style={{ position: "absolute", left: 11, top: 13, opacity: 0.5 }} aria-hidden />
          <input className="ax-input" style={{ paddingLeft: 32 }} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Модель или мощность" aria-label="Поиск модели" />
        </div>
        {canPrice ? (
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <input className="ax-input num" style={{ width: 90 }} value={percent} onChange={(e) => setPercent(e.target.value)} placeholder="+5" inputMode="decimal" aria-label="Изменить цены на процент" />
            <button type="button" className="ax-btn" onClick={applyPercent}><Percent size={15} aria-hidden />Изменить цены показанных</button>
          </div>
        ) : null}
      </div>

      <div className="ax-table-wrap">
        <table className="ax-table">
          <thead><tr><th>Модель</th>{canPrice ? <><th className="r">Цена, сом</th><th className="r">Цена, $</th><th className="r">Скидка, %</th><th>На сайте</th></> : null}{canCost ? <th className="r">Себестоимость, сом</th> : null}<th className="r">Склад</th></tr></thead>
          <tbody>
            {visible.map((r) => {
              const o = initial.get(r.slug)!;
              const edited = o.price !== r.price || o.usd !== r.usd || o.discount !== r.discount || o.cost !== r.cost || o.onRequest !== r.onRequest;
              return (
                <tr key={r.slug} style={edited ? { background: "color-mix(in srgb, var(--sun) 12%, transparent)" } : undefined}>
                  <td><b>{r.model}</b><div className="ax-small">{r.hp} л.с.{r.status !== "published" ? " · не на сайте" : ""}</div></td>
                  {canPrice ? (
                    <>
                      <td className="r"><input className="ax-input num" style={{ width: 130, textAlign: "right" }} value={r.price} inputMode="numeric" aria-label={`Цена ${r.model}, сом`} placeholder="нет" onChange={(e) => set(r.slug, { price: e.target.value.replace(/\D/g, "") })} /></td>
                      <td className="r"><input className="ax-input num" style={{ width: 110, textAlign: "right" }} value={r.usd} inputMode="numeric" aria-label={`Цена ${r.model}, доллары`} placeholder={String(r.usdHint)} onChange={(e) => set(r.slug, { usd: e.target.value.replace(/\D/g, "") })} /></td>
                      <td className="r"><input className="ax-input num" style={{ width: 70, textAlign: "right" }} value={r.discount} inputMode="decimal" aria-label={`Скидка ${r.model}`} onChange={(e) => set(r.slug, { discount: e.target.value })} /></td>
                      <td><label style={{ display: "flex", gap: 6, alignItems: "center", whiteSpace: "nowrap", fontSize: 13 }}><input type="checkbox" checked={r.onRequest} onChange={(e) => set(r.slug, { onRequest: e.target.checked })} /> по запросу</label></td>
                    </>
                  ) : null}
                  {canCost ? <td className="r"><input className="ax-input num" style={{ width: 140, textAlign: "right" }} value={r.cost} inputMode="numeric" aria-label={`Себестоимость ${r.model}`} placeholder="не задана" onChange={(e) => set(r.slug, { cost: e.target.value.replace(/\D/g, "") })} /></td> : null}
                  <td className="r num">{r.stock}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {error ? <div className="ax-error" role="alert" style={{ marginTop: 10 }}>{error}</div> : null}
      <div className="ax-sticky-actions" style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <button type="button" className="ax-btn ax-btn-primary" disabled={pending || !changed.length} onClick={save}>{pending ? <LoaderCircle size={17} className="ax-spin" aria-hidden /> : null}Сохранить{changed.length ? ` (${changed.length})` : ""}</button>
        {changed.length ? <input className="ax-input" style={{ maxWidth: 320 }} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Причина: новый прайс завода" aria-label="Причина изменения" /> : <span className="ax-small">Изменённые строки подсветятся, сохранится всё одной кнопкой</span>}
      </div>
      {toast ? <Toast text={toast} onDone={() => setToast("")} /> : null}
    </>
  );
}
