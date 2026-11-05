import Link from "next/link";
import { requireSection } from "../../../_lib/session";
import { periodReport } from "../../../_lib/reports";
import { METHOD } from "../../../_lib/sales";
import { UNIT_STATUS } from "../../../_lib/stock";
import { money, percent, type Currency } from "../../../_lib/format";
import { Card, Notice, PageHeader, Progress } from "../../../_ui/ui";
import { PeriodBar, periodFrom } from "../../../_ui/period";
import { PrintPage } from "./print-page";

export const metadata = { title: "Отчёты" };
const cur = (c: string) => (c === "USD" || c === "CNY" ? c : "KGS") as Currency;

export default async function Reports({ searchParams }: PageProps<"/admin/work/reports">) {
  const { actor } = await requireSection("/admin/work/reports");
  const { from, to } = periodFrom(await searchParams);
  const r = await periodReport(actor, from, to);
  const s = r.sales;
  const stockValue = r.stock.reduce((a, x) => a + x.value, 0);
  const maxSrc = Math.max(1, ...r.leads.sources.map((x) => x.n));
  const currencies = [...new Set(r.cash.map((c) => c.currency))];

  return (
    <>
      <PageHeader title="Отчёт за период" subtitle={`${from.split("-").reverse().join(".")} - ${to.split("-").reverse().join(".")}. Суммы в сомах по курсу дня продажи.`} actions={<PrintPage />} />
      <PeriodBar base="/admin/work/reports" from={from} to={to} />
      {s.preliminary ? <div style={{ marginBottom: 12 }}><Notice tone="warn">{s.preliminary} продаж с предварительной себестоимостью: прибыль уточнится после выдачи.</Notice></div> : null}

      <div className="ax-grid ax-g4" style={{ marginBottom: 14 }}>
        <Link href="/admin/work/sales" className="ax-card ax-kpi ax-k-sky"><div className="ax-kpi-l">Продаж</div><div className="ax-kpi-v num">{s.n}</div><div className="ax-kpi-h">выручка {money(s.revenue)}</div></Link>
        <Link href={`/admin/work/margin?from=${from}&to=${to}`} className="ax-card ax-kpi ax-k-green"><div className="ax-kpi-l">Валовая прибыль</div><div className={`ax-kpi-v num ${s.gross < 0 ? "ax-down" : ""}`}>{money(s.gross)}</div><div className="ax-kpi-h">{s.revenue ? percent(s.gross, s.revenue) : ""}</div></Link>
        <Link href={`/admin/work/expenses?from=${from}&to=${to}`} className="ax-card ax-kpi ax-k-sun"><div className="ax-kpi-l">Расходы</div><div className="ax-kpi-v num">{money(s.opex)}</div><div className="ax-kpi-h">аренда, зарплаты, реклама</div></Link>
        <div className="ax-card ax-kpi ax-k-teal"><div className="ax-kpi-l">Чистая прибыль</div><div className={`ax-kpi-v num ${s.net < 0 ? "ax-down" : ""}`}>{money(s.net)}</div></div>
      </div>

      <div className="ax-grid ax-g2" style={{ gap: 14 }}>
        <Card title="Продажи по способу оплаты">
          {s.byMethod.length ? s.byMethod.map((m) => <div key={m.method} className="ax-row-line"><span>{METHOD[m.method as keyof typeof METHOD]?.label ?? m.method} <span className="ax-small">· {m.n}</span></span><b className="num">{money(m.revenue)}</b></div>) : <p className="ax-small" style={{ margin: 0 }}>Продаж нет.</p>}
        </Card>
        <Card title="Лучшие модели по марже">
          {s.models.length ? s.models.map((m) => <div key={m.key} className="ax-row-line"><span>{m.label} <span className="ax-small">· {m.qty} шт.</span></span><b className="num">{money(m.revenue_kgs - m.cost_kgs)}</b></div>) : <p className="ax-small" style={{ margin: 0 }}>Нет данных.</p>}
        </Card>
        <Card title="Менеджеры">
          {s.managers.length ? s.managers.map((m) => <div key={m.manager} className="ax-row-line"><span>{m.manager} <span className="ax-small">· {m.n} продаж</span></span><b className="num">{money(m.revenue_kgs)}</b></div>) : <p className="ax-small" style={{ margin: 0 }}>Нет данных.</p>}
        </Card>
        <Card title="Движение денег">
          {currencies.length ? currencies.map((c) => {
            const inn = r.cash.find((x) => x.currency === c && x.direction === "in")?.total ?? 0, out = r.cash.find((x) => x.currency === c && x.direction === "out")?.total ?? 0;
            return <div key={c} className="ax-row-line"><span>{c === "KGS" ? "Сомы" : c}</span><span className="num ax-small">приход <b className="ax-in">{money(inn, cur(c))}</b> · расход <b className="ax-out">{money(out, cur(c))}</b></span></div>;
          }) : <p className="ax-small" style={{ margin: 0 }}>Движений нет.</p>}
          <p className="ax-small" style={{ marginBottom: 0 }}>Переводы между кассами не учитываются.</p>
        </Card>
        <Card title="Заявки и конверсия">
          <div className="ax-row-line"><span>Заявок</span><b className="num">{r.leads.total}</b></div>
          <div className="ax-row-line"><span>Стали продажей</span><b className="num">{r.leads.sold} <span className="ax-small">{r.leads.total ? percent(r.leads.sold, r.leads.total) : ""}</span></b></div>
          <div className="ax-row-line" style={{ marginBottom: 8 }}><span>Отказ</span><b className="num">{r.leads.lost}</b></div>
          {r.leads.sources.map((x) => <div key={x.source} style={{ display: "grid", gap: 3, marginBottom: 6 }}><span className="ax-row-line ax-small"><span>{x.source}</span><span>{x.n} / продаж {x.sold}</span></span><Progress value={x.n} max={maxSrc} /></div>)}
        </Card>
        <Card title="Склад сейчас" more={{ href: "/admin/work/stock", label: "Техника" }}>
          {r.stock.map((x) => <div key={x.status} className="ax-row-line"><span>{UNIT_STATUS[x.status]?.label ?? x.status} <span className="ax-small">· {x.n}</span></span><b className="num">{money(x.value)}</b></div>)}
          <div className="ax-row-line"><span>Запчасти{r.parts.low ? <span className="ax-small ax-down"> · {r.parts.low} пора заказать</span> : null}</span><b className="num">{money(r.parts.value)}</b></div>
          <div className="ax-row-line" style={{ borderTop: "1px solid var(--border)", paddingTop: 6 }}><b>Итого по себестоимости</b><b className="num">{money(stockValue + r.parts.value)}</b></div>
        </Card>
        <Card title="Долги сейчас" more={{ href: "/admin/work/debts", label: "Долги" }}>
          <div className="ax-row-line"><span>Всего должны <span className="ax-small">· {r.debts.clients}</span></span><b className="num">{money(r.debts.total)}</b></div>
          <div className="ax-row-line"><span>Просрочено <span className="ax-small">· {r.debts.overdueClients}</span></span><b className={`num ${r.debts.overdue ? "ax-down" : ""}`}>{money(r.debts.overdue)}</b></div>
        </Card>
        <Card title="Сервис" more={{ href: "/admin/work/service", label: "Обращения" }}>
          <div className="ax-row-line"><span>Новых обращений</span><b className="num">{r.service.opened}</b></div>
          <div className="ax-row-line"><span>Из них по гарантии</span><b className="num">{r.service.warranty}</b></div>
          <div className="ax-row-line"><span>Закрыто</span><b className="num">{r.service.closed}</b></div>
          <div className="ax-row-line"><span>Открыто сейчас</span><b className="num">{r.service.open}</b></div>
        </Card>
      </div>
    </>
  );
}
