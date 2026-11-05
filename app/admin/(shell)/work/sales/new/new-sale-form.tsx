"use client";
import { useEffect, useState, useTransition } from "react";
import { Check, LoaderCircle, Plus, Search, Trash2, TriangleAlert } from "lucide-react";
import { createSaleAction, searchCustomersAction, type CustomerHit } from "../../../../_lib/sales-actions";
import type { PaymentMethod, SalesPolicy } from "../../../../_lib/sales";
import { cn, Notice } from "../../../../_ui/ui";
import { Field } from "../../../../_ui/forms";

type Unit = { id: string; vin: string; model: string; tractor_slug: string; status: string; list_price_minor: number; cost_minor: number };
type Model = { slug: string; model: string; hp: number; priceUsd: number };
type MethodInfo = { key: PaymentMethod; label: string; short: string; tone: string; hint: string };
type Item = { key: string; kind: "unit" | "model_order" | "part" | "service"; unitId?: string; slug?: string; title: string; qty: string; price: string; costKgs: number };

const UNIT_STATUS: Record<string, string> = { stock: "на складе", ordered: "заказана", production: "в производстве", transit: "в пути", customs: "на таможне" };
const num = (v: string) => Number(String(v).replace(/\s/g, "").replace(",", ".")) || 0;
const fmt = (v: number, cur: "USD" | "KGS") => (cur === "USD" ? `$${Math.round(v).toLocaleString("ru-RU")}` : `${Math.round(v).toLocaleString("ru-RU")} с`);
const today = (plus = 0) => new Date(Date.now() + plus * 86400000).toISOString().slice(0, 10);
let seq = 0;
const key = () => `i${++seq}`;

export function NewSaleForm(props: {
  units: Unit[]; models: Model[]; fxDefault: number; fxDate: string | null; policy: SalesPolicy; methods: MethodInfo[];
  banks: string[]; showCost: boolean; isOwner: boolean; lead: { id: string; name: string; phone: string; slug: string | null } | null;
}) {
  const { units, models, policy, lead } = props;
  const [step, setStep] = useState(1);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  // 1. клиент
  const [customer, setCustomer] = useState<CustomerHit | null>(null);
  const [newCustomer, setNewCustomer] = useState({ name: lead?.name ?? "", phone: lead?.phone ?? "", region: "" });
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<CustomerHit[]>([]);
  const [searching, startSearch] = useTransition();
  useEffect(() => {
    if (query.trim().length < 2) return;
    const t = setTimeout(() => startSearch(async () => setHits(await searchCustomersAction(query))), 300);
    return () => clearTimeout(t);
  }, [query]);

  // 2. позиции и валюта
  const [currency, setCurrency] = useState<"USD" | "KGS">("USD");
  const [fx, setFx] = useState(String(props.fxDefault));
  const leadModel = lead?.slug ? models.find((m) => m.slug === lead.slug) : undefined;
  const [items, setItems] = useState<Item[]>([]);
  const [picker, setPicker] = useState<"unit" | "model" | "part" | null>(leadModel ? "unit" : null);
  const unitsForLead = leadModel ? units.filter((u) => u.tractor_slug === leadModel.slug) : [];

  const rate = currency === "KGS" ? 1 : num(fx) || props.fxDefault;
  const fromKgs = (minor: number) => (currency === "KGS" ? minor / 100 : minor / 100 / rate);
  const total = items.reduce((s, i) => s + num(i.price) * (num(i.qty) || 1), 0);
  const costKgs = items.reduce((s, i) => s + (i.costKgs / 100) * (num(i.qty) || 1), 0);
  const revenueKgs = currency === "KGS" ? total : total * rate;
  const costKnown = items.length > 0 && items.every((i) => i.kind !== "unit" || i.costKgs > 0) && items.some((i) => i.costKgs > 0);
  const belowCost = costKgs > 0 && revenueKgs < costKgs;

  function addUnit(u: Unit) {
    if (items.some((i) => i.unitId === u.id)) return;
    setItems((x) => [...x, { key: key(), kind: "unit", unitId: u.id, slug: u.tractor_slug, title: `${u.model} · VIN ${u.vin}`, qty: "1", price: String(Math.round(fromKgs(u.list_price_minor))), costKgs: u.cost_minor }]);
    setPicker(null);
  }
  function addModel(slug: string) {
    const m = models.find((x) => x.slug === slug);
    if (!m) return;
    setItems((x) => [...x, { key: key(), kind: "model_order", slug, title: `${m.model} · под заказ`, qty: "1", price: String(currency === "USD" ? m.priceUsd : Math.round(m.priceUsd * rate)), costKgs: 0 }]);
    setPicker(null);
  }
  function addFree(kind: "part" | "service") {
    setItems((x) => [...x, { key: key(), kind, title: "", qty: "1", price: "", costKgs: 0 }]);
    setPicker(null);
  }
  function switchCurrency(next: "USD" | "KGS") {
    if (next === currency) return;
    const r = num(fx) || props.fxDefault;
    setItems((x) => x.map((i) => ({ ...i, price: i.price ? String(Math.round(next === "KGS" ? num(i.price) * r : num(i.price) / r)) : "" })));
    setCurrency(next);
  }

  // 3. оплата
  const [method, setMethod] = useState<PaymentMethod>("full");
  const [bank, setBank] = useState(props.banks[0]);
  const [advance, setAdvance] = useState("");
  const [advanceDue, setAdvanceDue] = useState(today(3));
  const [months, setMonths] = useState("12");
  const [firstDue, setFirstDue] = useState("");
  const defaultReserve = method === "state_leasing" ? policy.stateLeasingReserveDays : policy.reserveDays;
  const [reserveDays, setReserveDays] = useState<string>("");
  const leasing = method === "bank_leasing" || method === "state_leasing";

  // 4. проверка
  const [belowCostReason, setBelowCostReason] = useState("");
  const [notes, setNotes] = useState("");

  function check(target: number): string {
    if (target > 1) {
      if (!customer && (newCustomer.name.trim().length < 2 || newCustomer.phone.replace(/\D/g, "").length < 8)) return "Выберите клиента из базы или укажите имя и телефон нового";
    }
    if (target > 2) {
      if (!items.length) return "Добавьте хотя бы одну позицию";
      if (currency === "USD" && !(num(fx) >= 1)) return "Укажите курс доллара";
      for (const i of items) {
        if ((i.kind === "part" || i.kind === "service") && i.title.trim().length < 2) return "Укажите название каждой запчасти или услуги";
        if (!(num(i.price) > 0)) return `Укажите цену: ${i.title || "позиция без названия"}`;
      }
    }
    if (target > 3) {
      if ((method === "prepay" || method === "installment") && !(num(advance) > 0)) return method === "prepay" ? "Укажите сумму предоплаты" : "Укажите первый взнос";
      if (num(advance) > total) return "Аванс больше суммы продажи";
      if (method === "installment" && !(num(months) >= 1 && num(months) <= 36)) return "Срок рассрочки: от 1 до 36 месяцев";
      const rd = num(reserveDays || String(defaultReserve));
      if (rd < 1 || rd > policy.maxReserveDays) return `Резерв: от 1 до ${policy.maxReserveDays} дней`;
    }
    return "";
  }
  function go(target: number) {
    const e = target > step ? check(target) : "";
    setError(e);
    if (!e) setStep(target);
  }
  function submit() {
    const e = check(5) || (belowCost && props.isOwner && belowCostReason.trim().length < 5 ? "Цена ниже себестоимости: укажите причину" : "");
    setError(e);
    if (e) return;
    start(async () => {
      const r = await createSaleAction({
        customerId: customer?.id,
        customer: customer ? undefined : newCustomer,
        leadId: lead?.id,
        currency,
        fxRate: currency === "USD" ? fx : 1,
        method,
        bankName: leasing ? bank : "",
        items: items.map((i) => ({ kind: i.kind, unitId: i.unitId, slug: i.slug, title: i.title, qty: num(i.qty) || 1, price: i.price })),
        advance: advance || undefined,
        advanceDue,
        months: method === "installment" ? num(months) : undefined,
        firstDue: firstDue || undefined,
        reserveDays: num(reserveDays || String(defaultReserve)),
        belowCostReason,
        notes,
      });
      if (r && !r.ok) setError(r.error ?? "Не удалось оформить продажу");
    });
  }

  const steps = ["Клиент", "Что покупает", "Оплата", "Проверка"];

  return (
    <div className="ax-grid ax-g-main" style={{ alignItems: "start" }}>
      <div className="ax-card">
        <ol className="ax-steps" style={{ listStyle: "none", padding: 0, margin: "0 0 18px" }} aria-label="Шаги оформления">
          {steps.map((s, i) => (
            <li key={s} style={{ display: "flex", alignItems: "center" }}>
              {i > 0 ? <span className={cn("ax-step-line", step > i && "is-done")} aria-hidden /> : null}
              <button type="button" className={cn("ax-step", step > i + 1 && "is-done", step === i + 1 && "is-cur")} style={{ border: 0, background: "none", cursor: "pointer", padding: 0 }} onClick={() => go(i + 1)} aria-current={step === i + 1 ? "step" : undefined}>
                <i>{step > i + 1 ? <Check size={13} aria-hidden /> : i + 1}</i>{s}
              </button>
            </li>
          ))}
        </ol>

        {step === 1 ? (
          <section aria-label="Клиент">
            {customer ? (
              <div className="ax-card" style={{ display: "flex", alignItems: "center", gap: 12, background: "var(--surface-2)" }}>
                <div style={{ flex: 1 }}><b>{customer.name}</b><div className="ax-small">{[customer.phone, customer.region].filter(Boolean).join(" · ")}</div></div>
                <button type="button" className="ax-btn ax-btn-sm" onClick={() => setCustomer(null)}>Другой клиент</button>
              </div>
            ) : (
              <>
                <Field label="Найти клиента в базе" htmlFor="c-search" hint="Имя, название хозяйства или телефон">
                  <div style={{ position: "relative" }}>
                    <input id="c-search" className="ax-input" value={query} onChange={(e) => { setQuery(e.target.value); if (e.target.value.trim().length < 2) setHits([]); }} placeholder="Например: Асан или 0555 12 34" />
                    <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: "var(--muted)" }}>{searching ? <LoaderCircle size={16} className="ax-spin" aria-hidden /> : <Search size={16} aria-hidden />}</span>
                  </div>
                </Field>
                {hits.length ? (
                  <ul className="ax-grouped" style={{ marginTop: -4 }}>
                    {hits.map((h) => (
                      <li key={h.id}><button type="button" className="ax-row" onClick={() => setCustomer(h)}><span className="ax-row-body"><span className="ax-row-t">{h.name}</span><span className="ax-row-s">{[h.phone, h.region].filter(Boolean).join(" · ")}</span></span><span className="ax-row-end">Выбрать</span></button></li>
                    ))}
                  </ul>
                ) : query.trim().length >= 2 && !searching ? <p className="ax-small">В базе не нашлось. Заполните нового клиента ниже.</p> : null}
                <div className="ax-group-t" style={{ marginTop: 10 }}>Или новый клиент</div>
                <div className="ax-grid ax-g2" style={{ gap: 12 }}>
                  <Field label="Имя или хозяйство" htmlFor="c-name"><input id="c-name" className="ax-input" value={newCustomer.name} onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })} placeholder="Токтогулов Асан / КФХ «Ак-Суу»" /></Field>
                  <Field label="Телефон" htmlFor="c-phone" hint="Если номер уже есть в базе, продажа оформится на этого клиента"><input id="c-phone" className="ax-input" inputMode="tel" value={newCustomer.phone} onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })} placeholder="+996 555 12 34 56" /></Field>
                  <Field label="Регион" htmlFor="c-region"><input id="c-region" className="ax-input" value={newCustomer.region} onChange={(e) => setNewCustomer({ ...newCustomer, region: e.target.value })} placeholder="Чуйская" /></Field>
                </div>
              </>
            )}
          </section>
        ) : null}

        {step === 2 ? (
          <section aria-label="Что покупает">
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end", marginBottom: 14 }}>
              <Field label="Валюта договора">
                <div style={{ display: "flex", gap: 6 }}>
                  {(["USD", "KGS"] as const).map((c) => <button key={c} type="button" className="ax-chip" aria-pressed={currency === c} onClick={() => switchCurrency(c)}>{c === "USD" ? "Доллары, $" : "Сомы, с"}</button>)}
                </div>
              </Field>
              {currency === "USD" ? (
                <Field label="Курс: сомов за $1" htmlFor="fx" hint={props.fxDate ? `НБКР на ${props.fxDate}` : "Курс НБКР недоступен, укажите вручную"}>
                  <input id="fx" className="ax-input num" style={{ maxWidth: 140 }} inputMode="decimal" value={fx} onChange={(e) => setFx(e.target.value)} />
                </Field>
              ) : null}
            </div>

            {items.length ? (
              <div className="ax-table-wrap" style={{ marginBottom: 12 }}>
                <table className="ax-table">
                  <thead><tr><th>Позиция</th><th style={{ width: 80 }}>Кол-во</th><th style={{ width: 150 }}>Цена за ед., {currency === "USD" ? "$" : "с"}</th><th /></tr></thead>
                  <tbody>
                    {items.map((i) => (
                      <tr key={i.key}>
                        <td>
                          {i.kind === "part" || i.kind === "service" ? (
                            <input className="ax-input" aria-label="Название" value={i.title} placeholder={i.kind === "part" ? "Запчасть: фильтр масляный…" : "Услуга: доставка, PDI, ТО…"} onChange={(e) => setItems((x) => x.map((y) => (y.key === i.key ? { ...y, title: e.target.value } : y)))} />
                          ) : (
                            <><b>{i.title}</b><div className="ax-small">{i.kind === "unit" ? "со склада, будет зарезервирована" : "VIN привяжете, когда машина придёт"}</div></>
                          )}
                        </td>
                        <td>{i.kind === "unit" ? <span className="num">1</span> : <input className="ax-input num" aria-label="Количество" inputMode="numeric" value={i.qty} onChange={(e) => setItems((x) => x.map((y) => (y.key === i.key ? { ...y, qty: e.target.value } : y)))} />}</td>
                        <td><input className="ax-input num" aria-label="Цена" inputMode="decimal" value={i.price} onChange={(e) => setItems((x) => x.map((y) => (y.key === i.key ? { ...y, price: e.target.value } : y)))} /></td>
                        <td><button type="button" className="ax-tap" aria-label="Убрать позицию" onClick={() => setItems((x) => x.filter((y) => y.key !== i.key))}><Trash2 size={17} aria-hidden /></button></td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot><tr><td colSpan={2}>Итого</td><td className="num">{fmt(total, currency)}</td><td /></tr></tfoot>
                </table>
              </div>
            ) : <Notice>Добавьте технику со склада, модель под заказ, запчасть или услугу.</Notice>}

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "12px 0" }}>
              <button type="button" className="ax-btn" aria-pressed={picker === "unit"} onClick={() => setPicker(picker === "unit" ? null : "unit")}><Plus size={16} aria-hidden />Машина со склада</button>
              <button type="button" className="ax-btn" aria-pressed={picker === "model"} onClick={() => setPicker(picker === "model" ? null : "model")}><Plus size={16} aria-hidden />Под заказ</button>
              <button type="button" className="ax-btn" onClick={() => addFree("part")}><Plus size={16} aria-hidden />Запчасть</button>
              <button type="button" className="ax-btn" onClick={() => addFree("service")}><Plus size={16} aria-hidden />Услуга</button>
            </div>

            {picker === "unit" ? (
              units.length ? (
                <ul className="ax-grouped" style={{ maxHeight: 340, overflowY: "auto" }}>
                  {(unitsForLead.length ? [...unitsForLead, ...units.filter((u) => !unitsForLead.includes(u))] : units).map((u) => {
                    const taken = items.some((i) => i.unitId === u.id);
                    return (
                      <li key={u.id}>
                        <button type="button" className="ax-row" disabled={taken} onClick={() => addUnit(u)}>
                          <span className="ax-row-body"><span className="ax-row-t">{u.model} · VIN {u.vin}</span><span className="ax-row-s">{UNIT_STATUS[u.status] ?? u.status}{u.list_price_minor ? ` · прайс ${fmt(fromKgs(u.list_price_minor), currency)}` : ""}{leadModel?.slug === u.tractor_slug ? " · модель из заявки" : ""}</span></span>
                          <span className="ax-row-end">{taken ? "добавлена" : "Добавить"}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              ) : <Notice tone="warn">Свободных машин нет. Продайте модель «под заказ»: VIN привяжете, когда машина придёт.</Notice>
            ) : null}
            {picker === "model" ? (
              <Field label="Модель под заказ" htmlFor="m-pick" hint="Цена подставится из прайса, её можно изменить">
                <select id="m-pick" className="ax-input" defaultValue="" onChange={(e) => e.target.value && addModel(e.target.value)}>
                  <option value="">Выберите модель</option>
                  {models.map((m) => <option key={m.slug} value={m.slug}>{m.model} · {m.hp} л.с. · прайс ${m.priceUsd.toLocaleString("ru-RU")}</option>)}
                </select>
              </Field>
            ) : null}
          </section>
        ) : null}

        {step === 3 ? (
          <section aria-label="Оплата">
            <div className="ax-options" role="group" aria-label="Способ оплаты" style={{ marginBottom: 16 }}>
              {props.methods.map((m) => (
                <button key={m.key} type="button" className="ax-option" aria-pressed={method === m.key} aria-label={`${m.label}: ${m.hint}`} onClick={() => setMethod(m.key)}>
                  <span className={`ax-ic ax-ic-sm ax-c-${m.tone}`} aria-hidden>{m.short[0]}</span>
                  <b>{m.label}</b><small>{m.hint}</small>
                </button>
              ))}
            </div>
            <div className="ax-grid ax-g2" style={{ gap: 12 }}>
              {leasing ? (
                <Field label="Банк или программа" htmlFor="bank"><select id="bank" className="ax-input" value={bank} onChange={(e) => setBank(e.target.value)}>{props.banks.map((b) => <option key={b}>{b}</option>)}</select></Field>
              ) : null}
              {method !== "full" ? (
                <Field label={method === "installment" ? "Первый взнос" : method === "prepay" ? "Предоплата" : "Аванс клиента (если есть)"} htmlFor="adv" hint={total ? `из ${fmt(total, currency)}` : undefined}>
                  <input id="adv" className="ax-input num" inputMode="decimal" value={advance} onChange={(e) => setAdvance(e.target.value)} placeholder={currency === "USD" ? "$" : "сом"} />
                </Field>
              ) : null}
              {method !== "full" ? <Field label="Когда внесёт" htmlFor="adv-due"><input id="adv-due" type="date" className="ax-input" value={advanceDue} onChange={(e) => setAdvanceDue(e.target.value)} /></Field> : null}
              {method === "installment" ? <Field label="Срок рассрочки, месяцев" htmlFor="months" hint={num(months) > 0 && total > num(advance) ? `≈ ${fmt((total - num(advance)) / num(months), currency)} в месяц` : undefined}><input id="months" className="ax-input num" inputMode="numeric" value={months} onChange={(e) => setMonths(e.target.value)} /></Field> : null}
              {method === "installment" ? <Field label="Первый платёж по графику" htmlFor="first" hint="Если пусто: через месяц после взноса"><input id="first" type="date" className="ax-input" value={firstDue} onChange={(e) => setFirstDue(e.target.value)} /></Field> : null}
              <Field label="Резерв машины, дней" htmlFor="reserve" hint={`По умолчанию ${defaultReserve}, максимум ${policy.maxReserveDays}`}>
                <input id="reserve" className="ax-input num" inputMode="numeric" value={reserveDays} placeholder={String(defaultReserve)} onChange={(e) => setReserveDays(e.target.value)} />
              </Field>
            </div>
            {method === "installment" ? <Notice tone="warn">Выдача по рассрочке: после первого взноса и с разрешения владельца.</Notice> : null}
            {leasing ? <Notice>В продаже появится чек-лист документов для банка. Остаток {total > num(advance) ? fmt(total - num(advance), currency) : ""} ждём от банка.</Notice> : null}
          </section>
        ) : null}

        {step === 4 ? (
          <section aria-label="Проверка">
            <dl className="ax-kv">
              <dt>Клиент</dt><dd>{customer ? customer.name : `${newCustomer.name} (новый)`}</dd>
              <dt>Позиции</dt><dd>{items.map((i) => `${num(i.qty) > 1 ? `${i.qty} × ` : ""}${i.title}`).join(", ")}</dd>
              <dt>Способ оплаты</dt><dd>{props.methods.find((m) => m.key === method)?.label}{leasing ? ` · ${bank}` : ""}</dd>
              {num(advance) > 0 ? <><dt>{method === "installment" ? "Первый взнос" : "Аванс"}</dt><dd className="num">{fmt(num(advance), currency)} до {advanceDue}</dd></> : null}
              {method === "installment" ? <><dt>График</dt><dd>{months} мес.</dd></> : null}
              <dt>Итого</dt><dd className="num" style={{ fontSize: 17 }}>{fmt(total, currency)}</dd>
              {currency === "USD" ? <><dt>В сомах по курсу {fx}</dt><dd className="num">{fmt(total * rate, "KGS")}</dd></> : null}
              {props.showCost && costKgs > 0 ? <><dt>Себестоимость</dt><dd className="num">{fmt(costKgs, "KGS")}</dd><dt>Маржа</dt><dd className={cn("num", revenueKgs - costKgs >= 0 ? "ax-up" : "ax-down")}>{fmt(revenueKgs - costKgs, "KGS")}{costKnown ? "" : " (предварительно)"}</dd></> : null}
            </dl>
            <div style={{ marginTop: 12 }}>
              <Field label="Комментарий к продаже" htmlFor="notes"><textarea id="notes" className="ax-input" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Например: доставка в Талас за счёт клиента" /></Field>
            </div>
            {belowCost ? (
              props.isOwner ? (
                <>
                  <Notice tone="warn">Цена ниже себестоимости. Как владелец вы можете оформить, но нужна причина.</Notice>
                  <div style={{ marginTop: 10 }}><Field label="Причина продажи ниже себестоимости" htmlFor="bcr"><input id="bcr" className="ax-input" value={belowCostReason} onChange={(e) => setBelowCostReason(e.target.value)} /></Field></div>
                </>
              ) : (
                <Notice tone="bad">Цена ниже допустимой. Поднимите цену: продать дешевле себестоимости может только владелец.</Notice>
              )
            ) : null}
          </section>
        ) : null}

        {error ? <div className="ax-error" role="alert" style={{ marginTop: 12, display: "flex", gap: 6, alignItems: "center" }}><TriangleAlert size={16} aria-hidden />{error}</div> : null}
        <div style={{ display: "flex", gap: 8, marginTop: 18 }}>
          {step > 1 ? <button type="button" className="ax-btn" onClick={() => go(step - 1)}>← Назад</button> : null}
          {step < 4 ? (
            <button type="button" className="ax-btn ax-btn-primary" style={{ marginLeft: "auto" }} onClick={() => go(step + 1)}>Далее: {steps[step]} →</button>
          ) : (
            <button type="button" className="ax-btn ax-btn-primary" style={{ marginLeft: "auto" }} disabled={pending || (belowCost && !props.isOwner)} onClick={submit}>
              {pending ? <LoaderCircle size={17} className="ax-spin" aria-hidden /> : null}Оформить продажу
            </button>
          )}
        </div>
      </div>

      <aside className="ax-card" aria-label="Сводка">
        <h3 className="ax-card-h">Сводка</h3>
        <dl className="ax-kv">
          <dt>Клиент</dt><dd>{customer?.name || newCustomer.name || "не выбран"}</dd>
          <dt>Позиций</dt><dd>{items.length}</dd>
          <dt>Итого</dt><dd className="num" style={{ fontSize: 16 }}>{fmt(total, currency)}</dd>
          {props.showCost && costKgs > 0 ? <><dt>Маржа</dt><dd className={cn("num", revenueKgs - costKgs >= 0 ? "ax-up" : "ax-down")}>{fmt(revenueKgs - costKgs, "KGS")}</dd></> : null}
        </dl>
        {belowCost && !props.showCost ? <div style={{ marginTop: 12 }}><Notice tone="bad">Цена ниже допустимой</Notice></div> : null}
        {!props.showCost ? <p className="ax-small" style={{ marginTop: 12 }}>Себестоимость видят владелец, директор и бухгалтер. Если цена окажется ниже допустимой, система не даст оформить.</p> : null}
      </aside>
    </div>
  );
}
