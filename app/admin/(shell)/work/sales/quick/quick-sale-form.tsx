"use client";
import { useEffect, useState, useTransition } from "react";
import { LoaderCircle, Search } from "lucide-react";
import { quickSaleAction, searchCustomersAction, type CustomerHit } from "../../../../_lib/sales-actions";
import { Notice } from "../../../../_ui/ui";
import { Field } from "../../../../_ui/forms";

type Unit = { id: string; vin: string; model: string; list_price_minor: number; cost_minor: number };
type Account = { id: string; name: string; currency: string };

const num = (v: string) => Number(String(v).replace(/\s/g, "").replace(",", ".")) || 0;

export function QuickSaleForm({ units, accounts, fxDefault, isOwner }: { units: Unit[]; accounts: Account[]; fxDefault: number; isOwner: boolean }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState("");

  const [customer, setCustomer] = useState<CustomerHit | null>(null);
  const [fresh, setFresh] = useState({ name: "", phone: "", region: "", passport: "", address: "" });
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<CustomerHit[]>([]);
  const [searching, startSearch] = useTransition();
  useEffect(() => {
    if (query.trim().length < 2) return;
    const t = setTimeout(() => startSearch(async () => setHits(await searchCustomersAction(query))), 300);
    return () => clearTimeout(t);
  }, [query]);

  const [unit, setUnit] = useState<Unit | null>(null);
  const [unitQuery, setUnitQuery] = useState("");
  const found = units.filter((u) => `${u.model} ${u.vin}`.toLowerCase().includes(unitQuery.trim().toLowerCase())).slice(0, 8);

  const [currency, setCurrency] = useState<"KGS" | "USD">("KGS");
  const [fx, setFx] = useState(String(fxDefault));
  const [price, setPrice] = useState("");
  const rate = num(fx) || fxDefault;
  const fromKgs = (minor: number, cur: "KGS" | "USD") => Math.round((cur === "KGS" ? minor / 100 : minor / 100 / rate));
  function pickUnit(u: Unit) {
    setUnit(u);
    setPrice(u.list_price_minor ? String(fromKgs(u.list_price_minor, currency)) : "");
  }
  function changeCurrency(next: "KGS" | "USD") {
    if (next === currency) return;
    if (price) setPrice(String(Math.round(next === "KGS" ? num(price) * rate : num(price) / rate)));
    setCurrency(next);
    const same = accounts.find((a) => a.currency === next);
    if (same) setAccountId(same.id);
  }

  const [accountId, setAccountId] = useState((accounts.find((a) => a.currency === "KGS") ?? accounts[0])?.id ?? "");
  const account = accounts.find((a) => a.id === accountId);
  const payCurrency = account?.currency === "USD" ? "USD" : "KGS";
  const toPayCurrency = (v: number) => (payCurrency === currency ? v : payCurrency === "KGS" ? v * rate : v / rate);
  const fullAmount = Math.round(toPayCurrency(num(price)) * 100) / 100;
  const [paid, setPaid] = useState<string | null>(null);
  const paidValue = paid ?? (fullAmount ? String(fullAmount) : "");
  const isFull = fullAmount > 0 && Math.abs(num(paidValue) - fullAmount) < 1;
  const [deliverNow, setDeliverNow] = useState(true);

  const [reason, setReason] = useState("");
  const priceKgs = currency === "KGS" ? num(price) : num(price) * rate;
  const below = !!unit && unit.cost_minor > 0 && priceKgs > 0 && priceKgs < unit.cost_minor / 100;

  function submit() {
    if (!customer && (fresh.name.trim().length < 2 || fresh.phone.replace(/\D/g, "").length < 8)) return setError("Выберите клиента или укажите имя и телефон");
    if (!unit) return setError("Выберите машину");
    if (!(num(price) > 0)) return setError("Укажите цену");
    if (num(paidValue) > 0 && !accountId) return setError("Выберите кассу или счёт");
    setError("");
    start(async () => {
      const r = await quickSaleAction({
        customerId: customer?.id,
        customer: customer ? { passport: fresh.passport, address: fresh.address } : fresh,
        unitId: unit.id,
        currency,
        fxRate: fx,
        price,
        accountId,
        paid: paidValue,
        deliverNow: deliverNow && isFull,
        belowCostReason: reason,
      });
      if (r && !r.ok) setError(r.error ?? "Не удалось оформить продажу");
    });
  }

  return (
    <div className="ax-grid" style={{ gap: 14 }}>
      <section className="ax-card">
        <h3 className="ax-card-h">Клиент</h3>
        {customer ? (
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ flex: 1 }}><b>{customer.name}</b><div className="ax-small">{[customer.phone, customer.region].filter(Boolean).join(" · ")}</div></div>
            <button type="button" className="ax-btn ax-btn-sm" onClick={() => setCustomer(null)}>Другой клиент</button>
          </div>
        ) : (
          <>
            <Field label="Найти в базе" htmlFor="q-search">
              <div style={{ position: "relative" }}>
                <input id="q-search" className="ax-input" value={query} onChange={(e) => { setQuery(e.target.value); if (e.target.value.trim().length < 2) setHits([]); }} placeholder="Имя или телефон" />
                <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: "var(--muted)" }}>{searching ? <LoaderCircle size={16} className="ax-spin" aria-hidden /> : <Search size={16} aria-hidden />}</span>
              </div>
            </Field>
            {hits.length ? <ul className="ax-grouped">{hits.map((h) => <li key={h.id}><button type="button" className="ax-row" onClick={() => setCustomer(h)}><span className="ax-row-body"><span className="ax-row-t">{h.name}</span><span className="ax-row-s">{[h.phone, h.region].filter(Boolean).join(" · ")}</span></span><span className="ax-row-end">Выбрать</span></button></li>)}</ul> : null}
            <div className="ax-grid ax-g2" style={{ gap: 12 }}>
              <Field label="Имя или хозяйство" htmlFor="q-name"><input id="q-name" className="ax-input" value={fresh.name} onChange={(e) => setFresh({ ...fresh, name: e.target.value })} /></Field>
              <Field label="Телефон" htmlFor="q-phone"><input id="q-phone" className="ax-input" inputMode="tel" value={fresh.phone} onChange={(e) => setFresh({ ...fresh, phone: e.target.value })} placeholder="+996 555 12 34 56" /></Field>
            </div>
          </>
        )}
        <details style={{ marginTop: 8 }}>
          <summary className="ax-small" style={{ cursor: "pointer" }}>Паспорт и адрес для договора (можно позже)</summary>
          <div className="ax-grid ax-g2" style={{ gap: 12, marginTop: 8 }}>
            <Field label="Паспорт" htmlFor="q-pass"><input id="q-pass" className="ax-input" value={fresh.passport} onChange={(e) => setFresh({ ...fresh, passport: e.target.value })} /></Field>
            <Field label="Адрес" htmlFor="q-addr"><input id="q-addr" className="ax-input" value={fresh.address} onChange={(e) => setFresh({ ...fresh, address: e.target.value })} /></Field>
          </div>
        </details>
      </section>

      <section className="ax-card">
        <h3 className="ax-card-h">Машина</h3>
        {unit ? (
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ flex: 1 }}><b>{unit.model}</b><div className="ax-small num">VIN {unit.vin}</div></div>
            <button type="button" className="ax-btn ax-btn-sm" onClick={() => setUnit(null)}>Другая машина</button>
          </div>
        ) : (
          <>
            <Field label="Модель или VIN" htmlFor="q-unit"><input id="q-unit" className="ax-input" value={unitQuery} onChange={(e) => setUnitQuery(e.target.value)} /></Field>
            {found.length ? <ul className="ax-grouped">{found.map((u) => <li key={u.id}><button type="button" className="ax-row" onClick={() => pickUnit(u)}><span className="ax-row-body"><span className="ax-row-t">{u.model}</span><span className="ax-row-s num">VIN {u.vin}</span></span><span className="ax-row-end">Выбрать</span></button></li>)}</ul> : <p className="ax-small" style={{ margin: 0 }}>Ничего не нашлось.</p>}
          </>
        )}
      </section>

      <section className="ax-card">
        <h3 className="ax-card-h">Цена и оплата</h3>
        <div className="ax-grid ax-g2" style={{ gap: 12 }}>
          <Field label="Валюта договора">
            <div style={{ display: "flex", gap: 6 }}>
              {(["KGS", "USD"] as const).map((c) => <button key={c} type="button" className="ax-chip" aria-pressed={currency === c} onClick={() => changeCurrency(c)}>{c === "USD" ? "Доллары, $" : "Сомы, с"}</button>)}
            </div>
          </Field>
          <Field label="Курс: сомов за $1" htmlFor="q-fx"><input id="q-fx" className="ax-input num" inputMode="decimal" value={fx} onChange={(e) => setFx(e.target.value)} /></Field>
          <Field label={`Цена, ${currency === "USD" ? "$" : "с"}`} htmlFor="q-price"><input id="q-price" className="ax-input num" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} /></Field>
          <Field label="Касса или счёт" htmlFor="q-acc"><select id="q-acc" className="ax-input" value={accountId} onChange={(e) => setAccountId(e.target.value)}>{accounts.map((a) => <option key={a.id} value={a.id}>{a.name} ({a.currency})</option>)}</select></Field>
          <Field label={`Оплачено сейчас, ${payCurrency === "USD" ? "$" : "с"}`} htmlFor="q-paid" hint="Меньше цены: станет предоплатой, остаток запишется в график. 0: только резерв"><input id="q-paid" className="ax-input num" inputMode="decimal" value={paidValue} onChange={(e) => setPaid(e.target.value)} /></Field>
        </div>
        <label className="ax-check" style={{ borderBottom: 0 }}><input type="checkbox" checked={deliverNow && isFull} disabled={!isFull} onChange={(e) => setDeliverNow(e.target.checked)} /> Выдать технику сразу{isFull ? "" : " (доступно при полной оплате)"}</label>
        {below ? (
          <div style={{ display: "grid", gap: 8, marginTop: 8 }}>
            <Notice tone="warn">{isOwner ? "Цена ниже себестоимости. Укажите причину." : "Цена ниже себестоимости: такую продажу может оформить только владелец."}</Notice>
            {isOwner ? <Field label="Причина" htmlFor="q-reason"><input id="q-reason" className="ax-input" value={reason} onChange={(e) => setReason(e.target.value)} /></Field> : null}
          </div>
        ) : null}
      </section>

      {error ? <div className="ax-error" role="alert">{error}</div> : null}
      <div className="ax-sticky-actions">
        <button type="button" className="ax-btn ax-btn-primary" disabled={pending} onClick={submit}>{pending ? <LoaderCircle size={17} className="ax-spin" aria-hidden /> : null}Оформить продажу</button>
      </div>
    </div>
  );
}
