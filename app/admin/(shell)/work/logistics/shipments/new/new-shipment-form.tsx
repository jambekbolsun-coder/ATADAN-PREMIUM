"use client";
import { useState, useTransition } from "react";
import { LoaderCircle, Plus, Trash2 } from "lucide-react";
import { createShipmentAction } from "../../../../../_lib/stock-actions";
import { Field } from "../../../../../_ui/forms";
import { Notice } from "../../../../../_ui/ui";

type Row = { key: number; lineId: string; vin: string; engine: string; year: string; color: string };
let seq = 0;

export function NewShipmentForm({ poId, lines }: { poId: string; lines: { id: string; model: string; left: number }[] }) {
  const [tracking, setTracking] = useState("");
  const [route, setRoute] = useState("");
  const [transport, setTransport] = useState("");
  const [eta, setEta] = useState("");
  const [status, setStatus] = useState("shipped");
  const [allocation, setAllocation] = useState("value");
  const [rows, setRows] = useState<Row[]>(() => lines.flatMap((l) => Array.from({ length: l.left }, () => ({ key: ++seq, lineId: l.id, vin: "", engine: "", year: String(new Date().getFullYear()), color: "" }))).slice(0, 50));
  const [paste, setPaste] = useState("");
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  if (!lines.length) return <Notice tone="good">Все машины этого заказа уже в поставках.</Notice>;

  const used = (lineId: string) => rows.filter((r) => r.lineId === lineId).length;
  function applyPaste() {
    const vins = paste.split(/[\s,;]+/).map((v) => v.trim()).filter(Boolean);
    setRows((x) => {
      let i = 0;
      return x.map((r) => (!r.vin && i < vins.length ? { ...r, vin: vins[i++].toUpperCase() } : r));
    });
    setPaste("");
  }

  return (
    <div className="ax-card">
      <div className="ax-grid ax-g3" style={{ gap: 12 }}>
        <Field label="Номер поставки / трек" htmlFor="sh-track" hint="Если пусто, номер присвоится сам"><input id="sh-track" className="ax-input" value={tracking} onChange={(e) => setTracking(e.target.value)} placeholder="ПСТ-0014" /></Field>
        <Field label="Маршрут" htmlFor="sh-route"><input id="sh-route" className="ax-input" value={route} onChange={(e) => setRoute(e.target.value)} placeholder="Чанчжоу → Урумчи → Торугарт" /></Field>
        <Field label="Транспорт" htmlFor="sh-tr"><input id="sh-tr" className="ax-input" value={transport} onChange={(e) => setTransport(e.target.value)} placeholder="Ж/д + фура" /></Field>
        <Field label="Ожидаемая дата прибытия" htmlFor="sh-eta"><input id="sh-eta" type="date" className="ax-input" value={eta} onChange={(e) => setEta(e.target.value)} /></Field>
        <Field label="Где сейчас" htmlFor="sh-st"><select id="sh-st" className="ax-input" value={status} onChange={(e) => setStatus(e.target.value)}><option value="planned">Планируется</option><option value="shipped">Отгружено с завода</option><option value="transit">В пути</option><option value="customs">На таможне</option><option value="cleared">Растаможено</option></select></Field>
        <Field label="Расходы распределять" htmlFor="sh-al"><select id="sh-al" className="ax-input" value={allocation} onChange={(e) => setAllocation(e.target.value)}><option value="value">Пропорционально закупочной цене</option><option value="equal">Поровну на машину</option><option value="manual">Вручную по каждой машине</option></select></Field>
      </div>

      <div className="ax-group-t" style={{ marginTop: 6 }}>Машины ({rows.length})</div>
      <Field label="Быстро вставить VIN из упаковочного листа" htmlFor="sh-paste" hint="Скопируйте столбец VIN из Excel или письма: они заполнят пустые строки по порядку">
        <div style={{ display: "flex", gap: 8 }}><textarea id="sh-paste" className="ax-input" style={{ minHeight: 44 }} value={paste} onChange={(e) => setPaste(e.target.value)} /><button type="button" className="ax-btn" onClick={applyPaste} disabled={!paste.trim()}>Вставить</button></div>
      </Field>
      <div className="ax-table-wrap" style={{ marginBottom: 10 }}>
        <table className="ax-table">
          <thead><tr><th>Модель</th><th>VIN</th><th>№ двигателя</th><th style={{ width: 90 }}>Год</th><th style={{ width: 120 }}>Цвет</th><th /></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.key}>
                <td><select className="ax-input" aria-label="Модель" value={r.lineId} onChange={(e) => setRows((x) => x.map((y) => (y.key === r.key ? { ...y, lineId: e.target.value } : y)))}>{lines.map((l) => <option key={l.id} value={l.id}>{l.model} (осталось {l.left})</option>)}</select></td>
                <td><input className="ax-input num" aria-label="VIN" value={r.vin} onChange={(e) => setRows((x) => x.map((y) => (y.key === r.key ? { ...y, vin: e.target.value.toUpperCase() } : y)))} placeholder="LCF…" /></td>
                <td><input className="ax-input" aria-label="Номер двигателя" value={r.engine} onChange={(e) => setRows((x) => x.map((y) => (y.key === r.key ? { ...y, engine: e.target.value } : y)))} /></td>
                <td><input className="ax-input num" aria-label="Год" inputMode="numeric" value={r.year} onChange={(e) => setRows((x) => x.map((y) => (y.key === r.key ? { ...y, year: e.target.value } : y)))} /></td>
                <td><input className="ax-input" aria-label="Цвет" value={r.color} onChange={(e) => setRows((x) => x.map((y) => (y.key === r.key ? { ...y, color: e.target.value } : y)))} /></td>
                <td><button type="button" className="ax-tap" aria-label="Убрать машину" onClick={() => setRows((x) => x.filter((y) => y.key !== r.key))}><Trash2 size={17} aria-hidden /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button type="button" className="ax-btn" onClick={() => setRows((x) => [...x, { key: ++seq, lineId: lines.find((l) => used(l.id) < l.left)?.id ?? lines[0].id, vin: "", engine: "", year: String(new Date().getFullYear()), color: "" }])}><Plus size={16} aria-hidden />Ещё машина</button>
      <p className="ax-small">В этой поставке может быть часть заказа: лишние строки уберите, остальное отправите следующей поставкой.</p>
      {error ? <div className="ax-error" role="alert" style={{ marginBottom: 10 }}>{error}</div> : null}
      <button
        type="button"
        className="ax-btn ax-btn-primary"
        disabled={pending}
        onClick={() => {
          setError("");
          if (!rows.length) return setError("Добавьте хотя бы одну машину");
          if (rows.some((r) => r.vin.trim().length < 6)) return setError("Укажите VIN у каждой машины (минимум 6 символов)");
          start(async () => {
            const r = await createShipmentAction({ poId, tracking, route, transport, eta: eta || undefined, status, allocation, units: rows.map((x) => ({ lineId: x.lineId, vin: x.vin, engine: x.engine, year: x.year, color: x.color })) });
            if (r && !r.ok) setError(r.error ?? "Не удалось создать поставку");
          });
        }}
      >
        {pending ? <LoaderCircle size={17} className="ax-spin" aria-hidden /> : null}Создать поставку
      </button>
    </div>
  );
}
