import Link from "next/link";
import { FileText } from "lucide-react";
import { notFound } from "next/navigation";
import { getUsdKgsRate } from "../../../../../lib/exchange-rate";
import { requireSection, seesCost } from "../../../../_lib/session";
import { DOSSIER, DOSSIER_LABEL, getSale, isBoss, isCompany, METHOD, moneyAccounts, sellableUnits, statusLabel, toKgs } from "../../../../_lib/sales";
import { date, dateTime, money } from "../../../../_lib/format";
import { Badge, Card, Notice, PageHeader, Progress, Tag } from "../../../../_ui/ui";
import { SaleActions, PaymentRowActions, DossierToggle, AttachUnit } from "./sale-actions";

export const metadata = { title: "Продажа" };

const SCHEDULE_KIND: Record<string, string> = { advance: "Аванс", installment: "Платёж по графику", bank: "Оплата банка", balance: "Оплата" };
const PAYMENT_METHOD: Record<string, string> = { cash: "наличные", bank_transfer: "перевод", card: "карта", refund: "возврат" };

export default async function SaleCard({ params, searchParams }: PageProps<"/admin/work/sales/[id]">) {
  const { actor } = await requireSection("/admin/work/sales");
  const { id } = await params;
  const sp = await searchParams;
  const data = await getSale(actor, id);
  if (!data) notFound();
  const { sale, items, payments, schedule, events } = data;
  const [accounts, fx, units] = await Promise.all([moneyAccounts(), getUsdKgsRate(), items.some((i) => i.kind === "model_order" && i.active) ? sellableUnits() : Promise.resolve([])]);
  const cur = sale.currency;
  const left = Math.max(0, sale.total_minor - sale.paid_minor);
  const st = statusLabel(sale);
  const m = METHOD[sale.payment_method];
  const leasing = sale.payment_method.endsWith("leasing");
  const active = items.filter((i) => i.active);
  const pendingModel = active.filter((i) => i.kind === "model_order");
  const notOnStock = active.filter((i) => i.inventory_unit_id && !["stock", "reserved"].includes(i.unit_status ?? ""));
  const canSeeCost = seesCost(actor);
  const marginKgs = toKgs(sale.total_minor, cur, sale.fx_rate) - sale.cost_kgs_minor;
  let dossier: Record<string, boolean> = {};
  try { dossier = JSON.parse((sale as { dossier_json?: string }).dossier_json || "{}"); } catch { dossier = {}; }

  // Почему нельзя выдать: объясняем прямо на кнопке.
  const deliverBlock = sale.status !== "booked" ? "" :
    pendingModel.length ? `Сначала привяжите VIN: ${pendingModel[0].title}` :
    notOnStock.length ? `Машина ещё не на складе: ${notOnStock[0].title}` :
    left > 0 && !sale.debt_allowed_at ? (sale.payment_method === "installment" ? "Нужен первый взнос и разрешение владельца" : "Выдача после полной оплаты или с разрешения владельца") : "";

  const stepsDef = [
    { label: "Оформлена", done: true },
    ...(leasing ? [{ label: "Банк одобрил", done: sale.bank_decision === "approved", bad: sale.bank_decision === "rejected" }] : []),
    { label: left === 0 ? "Оплачена" : `Оплата ${Math.round((sale.paid_minor / sale.total_minor) * 100)}%`, done: left === 0 },
    { label: "Выдана", done: !!sale.delivered_at },
    { label: "Закрыта", done: sale.status === "closed" },
  ];
  const curIdx = stepsDef.findIndex((s) => !s.done);

  return (
    <>
      <PageHeader
        title={<>Продажа {sale.number} <Badge tone={st.tone}>{st.label}</Badge></>}
        subtitle={<>Оформлена {date(sale.sold_at)} · менеджер {sale.manager ?? "не указан"}{sale.reserve_until && sale.status === "booked" ? ` · резерв до ${date(sale.reserve_until)}` : ""}</>}
        actions={
          <>
          {sale.status !== "cancelled" ? <Link className="ax-btn" href={`/admin/print/sale/${sale.id}?doc=contract`} target="_blank"><FileText size={16} aria-hidden />Документы</Link> : null}
          <SaleActions
            saleId={sale.id}
            status={sale.status}
            currency={cur}
            left={left}
            paid={sale.paid_minor}
            leasing={leasing}
            bankDecision={sale.bank_decision}
            method={sale.payment_method}
            bankName={sale.bank_name}
            accounts={accounts}
            fxDefault={fx?.value ? Math.round(fx.value * 100) / 100 : sale.fx_rate}
            deliverBlock={deliverBlock}
            debtAllowed={!!sale.debt_allowed_at}
            canDebt={actor.role === "owner"}
            canCancel={isBoss(actor)}
            canRefund={isCompany(actor)}
            canBankPay={actor.role !== "manager"}
            reserveUntil={sale.reserve_until}
          />
          </>
        }
      />
      {sp.created ? <div style={{ marginBottom: 12 }}><Notice tone="good">Продажа оформлена. Машины зарезервированы, график платежей создан.</Notice></div> : null}

      <div className="ax-card" style={{ marginBottom: 14, padding: "14px 18px" }}>
        <ol className="ax-steps" style={{ listStyle: "none", margin: 0, padding: 0 }}>
          {sale.status === "cancelled" ? (
            <li className="ax-step is-bad"><i>✕</i>Отменена {date((sale as { cancelled_at?: string }).cancelled_at)}: {(sale as { cancel_reason?: string }).cancel_reason}</li>
          ) : stepsDef.map((s, i) => (
            <li key={s.label} style={{ display: "flex", alignItems: "center" }}>
              {i > 0 ? <span className={`ax-step-line ${s.done ? "is-done" : ""}`} aria-hidden /> : null}
              <span className={`ax-step ${"bad" in s && s.bad ? "is-bad" : s.done ? "is-done" : i === curIdx ? "is-cur" : ""}`}><i>{"bad" in s && s.bad ? "✕" : s.done ? "✓" : i + 1}</i>{"bad" in s && s.bad ? "Банк отказал" : s.label}</span>
            </li>
          ))}
        </ol>
      </div>

      <div className="ax-grid ax-g-main">
        <div className="ax-grid" style={{ alignContent: "start" }}>
          <div className="ax-grid ax-g2">
            <Card title="Клиент" more={{ href: `/admin/work/clients/${sale.customer_id}`, label: "Карточка" }}>
              <dl className="ax-kv">
                <dt>Имя</dt><dd>{sale.customer}</dd>
                <dt>Телефон</dt><dd className="num"><a href={`tel:${sale.phone}`}>{sale.phone}</a></dd>
                {sale.region ? <><dt>Регион</dt><dd>{sale.region}</dd></> : null}
              </dl>
            </Card>
            <Card title="Условия">
              <dl className="ax-kv">
                <dt>Способ</dt><dd><Tag tone={m.tone}>{m.label}</Tag></dd>
                {leasing ? <><dt>Банк</dt><dd>{sale.bank_name || "не указан"}</dd></> : null}
                <dt>Валюта</dt><dd>{cur === "USD" ? `доллары, курс ${sale.fx_rate}` : "сомы"}</dd>
                {sale.debt_allowed_at ? <><dt>Выдача в долг</dt><dd>разрешил {(sale as { debt_allowed_by_name?: string }).debt_allowed_by_name ?? "владелец"}</dd></> : null}
                {canSeeCost && sale.cost_kgs_minor > 0 ? <><dt>Маржа</dt><dd className={marginKgs >= 0 ? "ax-up num" : "ax-down num"}>{money(marginKgs)}</dd></> : null}
              </dl>
            </Card>
          </div>

          <Card title="Что купил" flush>
            <div className="ax-table-wrap" style={{ border: 0, borderRadius: 0 }}>
              <table className="ax-table">
                <thead><tr><th>Позиция</th><th className="r">Кол-во</th><th className="r">Цена</th><th className="r">Сумма</th>{canSeeCost ? <th className="r">Себестоимость</th> : null}</tr></thead>
                <tbody>
                  {items.filter((i) => i.active || sale.status === "cancelled").map((i) => (
                    <tr key={i.id}>
                      <td>
                        {i.inventory_unit_id ? <Link href={`/admin/work/stock/${i.inventory_unit_id}`} className="ax-strong">{i.title}</Link> : <b>{i.title}</b>}
                        <div className="ax-small">{i.kind === "unit" ? `машина · ${i.unit_status === "delivered" ? "выдана" : i.unit_status === "reserved" ? "в резерве" : i.unit_status ?? ""}` : i.kind === "model_order" ? "под заказ: VIN ещё не привязан" : i.kind === "part" ? "запчасть" : "услуга"}</div>
                        {i.kind === "model_order" && i.active && sale.status === "booked" ? <AttachUnit saleId={sale.id} itemId={i.id} units={units.filter((u) => u.tractor_slug === i.tractor_slug)} /> : null}
                      </td>
                      <td className="r num">{i.qty}</td>
                      <td className="r num">{money(i.price_minor, cur)}</td>
                      <td className="r num ax-strong">{money(i.price_minor * i.qty, cur)}</td>
                      {canSeeCost ? <td className="r num ax-small">{i.cost_kgs_minor ? money(i.cost_kgs_minor * i.qty) : "нет данных"}</td> : null}
                    </tr>
                  ))}
                </tbody>
                <tfoot><tr><td colSpan={3}>Итого</td><td className="r num">{money(sale.total_minor, cur)}</td>{canSeeCost ? <td className="r num">{sale.cost_kgs_minor ? money(sale.cost_kgs_minor) : ""}</td> : null}</tr></tfoot>
              </table>
            </div>
          </Card>

          <Card title="Оплата">
            <div className="ax-grid ax-g3" style={{ marginBottom: 12 }}>
              <div><div className="ax-small">Сумма продажи</div><div className="num ax-strong" style={{ fontSize: 19 }}>{money(sale.total_minor, cur)}</div></div>
              <div><div className="ax-small">Оплачено</div><div className="num ax-in" style={{ fontSize: 19 }}>{money(sale.paid_minor, cur)}</div></div>
              <div><div className="ax-small">Осталось{leasing && sale.status === "booked" && left > 0 ? " · большую часть платит банк" : ""}</div><div className="num ax-strong" style={{ fontSize: 19, color: left ? "var(--warn)" : "var(--good)" }}>{money(left, cur)}</div></div>
            </div>
            <Progress value={sale.paid_minor} max={sale.total_minor} />
            {schedule.length ? (
              <>
                <div className="ax-group-t" style={{ marginTop: 16 }}>График</div>
                <div className="ax-table-wrap">
                  <table className="ax-table">
                    <thead><tr><th>Срок</th><th>Что</th><th>Кто платит</th><th className="r">Сумма</th></tr></thead>
                    <tbody>
                      {schedule.map((s) => {
                        const late = s.due_date < new Date().toISOString().slice(0, 10) && left > 0 && sale.status !== "cancelled";
                        return <tr key={s.id}><td className="num">{date(s.due_date)} {late ? <Badge tone="bad">срок прошёл</Badge> : null}</td><td>{SCHEDULE_KIND[s.kind] ?? s.kind}</td><td>{s.payer === "bank" ? sale.bank_name || "банк" : "клиент"}</td><td className="r num">{money(s.amount_minor, cur)}</td></tr>;
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            ) : null}
            <div className="ax-group-t" style={{ marginTop: 16 }}>Платежи</div>
            {payments.length ? (
              <div className="ax-table-wrap">
                <table className="ax-table">
                  <thead><tr><th>Дата</th><th>От кого</th><th>Касса / счёт</th><th className="r">Сумма</th><th>Статус</th><th /></tr></thead>
                  <tbody>
                    {payments.map((p) => (
                      <tr key={p.id} style={p.status === "void" ? { opacity: 0.6 } : undefined}>
                        <td className="num">{date(p.paid_at)}</td>
                        <td>{p.direction === "out" ? "Возврат клиенту" : p.payer === "bank" ? sale.bank_name || "Банк" : "Клиент"}<div className="ax-small">{PAYMENT_METHOD[p.method] ?? p.method}{p.reference ? ` · ${p.reference}` : ""}</div></td>
                        <td className="ax-small">{p.account}</td>
                        <td className={`r num ${p.direction === "out" ? "ax-out" : "ax-in"}`}>
                          {p.status === "void" ? <s>{money(p.amount_minor, p.currency)}</s> : `${p.direction === "out" ? "− " : "+ "}${money(p.amount_minor, p.currency)}`}
                          {p.currency !== cur ? <div className="ax-small">= {money(p.amount_sale_minor, cur)} по {p.fx_rate}</div> : null}
                        </td>
                        <td>{p.status === "void" ? <Badge tone="mute">Сторно</Badge> : <Badge tone="good">Проведён</Badge>}{p.status === "void" && p.void_reason ? <div className="ax-small">{p.void_reason}</div> : null}</td>
                        <td>{p.status === "posted" && isCompany(actor) ? <PaymentRowActions saleId={sale.id} paymentId={p.id} /> : null}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : <p className="ax-small">Платежей пока нет.</p>}
          </Card>
        </div>

        <div className="ax-grid" style={{ alignContent: "start" }}>
          {leasing ? (
            <Card title={<>Досье для банка <Badge tone={sale.bank_decision === "approved" ? "good" : sale.bank_decision === "rejected" ? "bad" : "warn"}>{sale.bank_decision === "approved" ? "Одобрено" : sale.bank_decision === "rejected" ? "Отказ" : "На рассмотрении"}</Badge></>}>
              {DOSSIER.map((k) => <DossierToggle key={k} saleId={sale.id} docKey={k} label={DOSSIER_LABEL[k]} checked={!!dossier[k]} disabled={sale.status === "cancelled"} />)}
              {(sale as { bank_note?: string }).bank_note ? <p className="ax-small" style={{ marginTop: 8 }}>Банк: {(sale as { bank_note?: string }).bank_note}</p> : null}
            </Card>
          ) : null}
          {(sale as { notes?: string }).notes ? <Card title="Комментарий"><p style={{ margin: 0, whiteSpace: "pre-wrap" }}>{(sale as { notes?: string }).notes}</p></Card> : null}
          <Card title="История">
            <ol className="ax-tl">
              {events.map((e) => <li key={e.id}>{e.detail}<small>{dateTime(e.created_at)}{e.author ? ` · ${e.author}` : ""}</small></li>)}
            </ol>
          </Card>
        </div>
      </div>
    </>
  );
}
