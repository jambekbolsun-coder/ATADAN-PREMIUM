"use client";
import { useEffect, useState, useTransition } from "react";
import { LoaderCircle, Search } from "lucide-react";
import { createTicketAction, searchServiceUnitsAction } from "../../../../_lib/ops-actions";
import { Field } from "../../../../_ui/forms";

type Unit = { id: string; vin: string; model: string; status: string; sale_number: string | null; customer: string | null; phone: string | null; delivered_at: string | null };

export function NewTicketForm({ kinds, staff, me, warrantyMonths, today }: { kinds: Record<string, string>; staff: { id: string; name: string }[]; me: string; warrantyMonths: number; today: string }) {
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<Unit[]>([]);
  const [unit, setUnit] = useState<Unit | null>(null);
  const [kind, setKind] = useState("warranty");
  const [issue, setIssue] = useState("");
  const [hours, setHours] = useState("");
  const [due, setDue] = useState("");
  const [assigned, setAssigned] = useState(me);
  const [force, setForce] = useState(false);
  const [error, setError] = useState("");
  const [searching, startSearch] = useTransition();
  const [pending, start] = useTransition();
  useEffect(() => {
    if (q.trim().length < 2) return;
    const t = setTimeout(() => startSearch(async () => setHits(await searchServiceUnitsAction(q))), 300);
    return () => clearTimeout(t);
  }, [q]);
  const until = unit?.delivered_at ? new Date(new Date(unit.delivered_at).setMonth(new Date(unit.delivered_at).getMonth() + warrantyMonths)) : null;
  const inWarranty = until ? until.toISOString().slice(0, 10) >= today : false;

  return (
    <div className="ax-grid" style={{ gap: 14 }}>
      <section className="ax-card">
        <h3 className="ax-card-h">1. Машина</h3>
        {unit ? (
          <div className="ax-row-line">
            <span><b>{unit.model}</b> · VIN <span className="num">{unit.vin}</span><div className="ax-small">{unit.customer ? `${unit.customer}, ${unit.phone ?? ""}` : "клиента нет (на складе)"}{unit.sale_number ? ` · продажа ${unit.sale_number}` : ""}{until ? ` · гарантия ${inWarranty ? "до" : "закончилась"} ${until.toLocaleDateString("ru-RU")}` : unit.delivered_at === null && unit.sale_number ? " · ещё не выдана" : ""}</div></span>
            <button type="button" className="ax-btn ax-btn-sm" onClick={() => setUnit(null)}>Другая</button>
          </div>
        ) : (
          <>
            <Field label="VIN, имя или телефон клиента" htmlFor="sv-q">
              <div style={{ position: "relative" }}><input id="sv-q" className="ax-input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="LCF… или Асанов" />{searching ? <LoaderCircle size={16} className="ax-spin" style={{ position: "absolute", right: 12, top: 13 }} aria-hidden /> : <Search size={16} style={{ position: "absolute", right: 12, top: 13, opacity: 0.5 }} aria-hidden />}</div>
            </Field>
            {hits.length ? (
              <ul className="ax-grouped">
                {hits.map((u) => (
                  <li key={u.id}><button type="button" className="ax-row" style={{ width: "100%", textAlign: "left" }} onClick={() => { setUnit(u); setKind(u.delivered_at ? "warranty" : "pdi"); }}>
                    <span className="ax-row-body"><span className="ax-row-t">{u.model} · <span className="num">{u.vin}</span></span><span className="ax-row-s">{u.customer ? `${u.customer} ${u.phone ?? ""}` : "на складе"}{u.sale_number ? ` · ${u.sale_number}` : ""}</span></span>
                  </button></li>
                ))}
              </ul>
            ) : q.trim().length >= 2 && !searching ? <p className="ax-small">Ничего не нашлось</p> : null}
          </>
        )}
      </section>
      <section className="ax-card">
        <h3 className="ax-card-h">2. Что случилось</h3>
        <div className="ax-grid ax-g2" style={{ gap: 12 }}>
          <Field label="Тип" htmlFor="sv-kind"><select id="sv-kind" className="ax-input" value={kind} onChange={(e) => setKind(e.target.value)}>{Object.entries(kinds).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></Field>
          <Field label="Моточасы" htmlFor="sv-h" hint="Со счётчика машины"><input id="sv-h" className="ax-input num" inputMode="numeric" value={hours} onChange={(e) => setHours(e.target.value)} /></Field>
          <Field label="Ответственный" htmlFor="sv-a"><select id="sv-a" className="ax-input" value={assigned} onChange={(e) => setAssigned(e.target.value)}>{staff.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></Field>
          <Field label="Срок" htmlFor="sv-due" hint="Если пропустить, придёт напоминание"><input id="sv-due" type="date" className="ax-input" value={due} onChange={(e) => setDue(e.target.value)} /></Field>
        </div>
        <Field label="Описание неисправности или работ" htmlFor="sv-issue"><textarea id="sv-issue" className="ax-input" rows={4} value={issue} onChange={(e) => setIssue(e.target.value)} placeholder="Течёт гидравлика заднего навеса, после 300 моточасов" /></Field>
        {kind === "warranty" && unit && !inWarranty ? <label className="ax-check" style={{ borderBottom: 0 }}><input type="checkbox" checked={force} onChange={(e) => setForce(e.target.checked)} /> Всё равно как гарантия (руководство согласовало)</label> : null}
      </section>
      {error ? <div className="ax-error" role="alert">{error}</div> : null}
      <div><button type="button" className="ax-btn ax-btn-primary" disabled={pending || !unit} onClick={() => { setError(""); start(async () => { const r = await createTicketAction({ unitId: unit!.id, kind, issue, engineHours: hours, dueAt: due, assignedTo: assigned, outOfWarranty: force }); if (r && !r.ok) setError(r.error ?? "Не удалось создать"); }); }}>{pending ? <LoaderCircle size={17} className="ax-spin" aria-hidden /> : null}Создать обращение</button></div>
    </div>
  );
}
