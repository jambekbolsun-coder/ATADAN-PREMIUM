import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { requireStaff, seesCost } from "../_lib/session";
import { loadDashboard, sourceLabel } from "../_lib/dashboard";
import { money, moneyShort, monthLong, monthShort, percent, date as fmtDate, plural } from "../_lib/format";
import { Badge, ButtonLink, Card, Empty, IconTile, PageHeader, Stat } from "../_ui/ui";
import { canSee, NAV } from "../_lib/nav";
import { METHOD } from "../_lib/sales";

const METHOD_COLOR: Record<string, string> = { full: "brand", prepay: "sun", installment: "lilac", bank_leasing: "sky", state_leasing: "teal" };

export const metadata = { title: "Главная" };

const SOURCE_TONES = ["green", "teal", "lilac", "sun", "sky", "terra"] as const;

function greeting() {
  const h = Number(new Intl.DateTimeFormat("ru-RU", { hour: "numeric", hour12: false, timeZone: "Asia/Bishkek" }).format(new Date()));
  return h < 5 ? "Доброй ночи" : h < 12 ? "Доброе утро" : h < 18 ? "Добрый день" : "Добрый вечер";
}

function delta(now: number, before: number) {
  if (!before) return null;
  const d = ((now - before) / before) * 100;
  const text = `${d >= 0 ? "▲" : "▼"} ${Math.abs(Math.round(d))}%`;
  return <span className={d >= 0 ? "ax-up" : "ax-down"}>{text}</span>;
}

export default async function Home() {
  const actor = await requireStaff("/admin");
  const d = await loadDashboard(actor);
  const name = (actor.display_name || "").split(/\s+/)[0];
  const can = (href: string) => {
    const item = NAV.find((i) => i.href === href);
    return item ? canSee(actor, item) : false;
  };
  const max = Math.max(1, ...d.months.map((m) => m.total));
  const leadsTotal = d.sources.reduce((s, x) => s + x.leads, 0);
  const methodsTotal = d.methods.reduce((s, x) => s + x.total, 0) || 1;
  const now = new Date();
  const mine = d.scope === "mine";

  return (
    <>
      <PageHeader
        title={`${greeting()}${name ? `, ${name}` : ""}`}
        subtitle={<>{monthLong(now)} · {mine ? "ваши продажи и клиенты" : "вся компания"}</>}
        actions={can("/admin/work/sales") ? <span className="ax-act-desktop"><ButtonLink href="/admin/work/sales/new" variant="primary">Новая продажа</ButtonLink></span> : null}
      />

      <div className="ax-grid ax-g4" style={{ marginBottom: 14 }}>
        {can("/admin/work/sales") || !mine ? (
          <Stat
            icon="cart" tone="sun"
            label={mine ? "Мои продажи за месяц" : "Выручка за месяц"}
            value={money(d.revenue.month)}
            hint={<>{delta(d.revenue.month, d.revenue.prev) ?? "нет данных за прошлый месяц"} · {d.revenue.count} {plural(d.revenue.count, "продажа", "продажи", "продаж")}</>}
            href="/admin/work/sales"
          />
        ) : null}
        {d.margin ? (
          <Stat
            icon="trend" tone="green" label="Валовая маржа"
            value={money(d.margin.month)}
            hint={<>{percent(d.margin.month, d.revenue.month)} от выручки{d.margin.known ? "" : " · есть продажи без себестоимости"}</>}
            href="/admin/work/margin"
          />
        ) : null}
        <Stat
          icon="tractor" tone="sky" label="Техника на складе"
          value={`${d.stock.count} шт.`}
          hint={<>{d.stock.value !== null ? `по себестоимости ${moneyShort(d.stock.value)} с · ` : ""}{d.stock.transit} в пути</>}
          href={can("/admin/work/stock") ? "/admin/work/stock" : undefined}
        />
        <Stat
          icon="scale" tone="terra" label={mine ? "Мне должны клиенты" : "Нам должны"}
          value={money(d.debts.total)}
          hint={d.debts.overdue ? <span className="ax-down">{money(d.debts.overdue)} просрочено</span> : "просрочек нет"}
          href={can("/admin/work/debts") ? "/admin/work/debts" : undefined}
        />
      </div>

      <div className="ax-grid ax-g-main">
        <div className="ax-grid" style={{ alignContent: "start" }}>
          <Card title="Продажи по месяцам" more={can("/admin/work/reports") ? { href: "/admin/work/reports", label: "Отчёты" } : undefined}>
            {d.months.some((m) => m.total > 0) ? (
              <div className="ax-bars" role="img" aria-label="Выручка по месяцам за полгода">
                {d.months.map((m, i) => (
                  <div key={m.key} className={i === d.months.length - 1 ? "is-cur" : undefined}>
                    <b className="num">{m.total ? moneyShort(m.total) : ""}</b>
                    <i style={{ height: `${Math.max(2, (m.total / max) * 100)}%` }} />
                    <small>{monthShort(m.date)}</small>
                  </div>
                ))}
              </div>
            ) : (
              <Empty icon="chart" tone="sky" title="Продаж пока нет" text="Когда оформите первую продажу, здесь появится график по месяцам." />
            )}
          </Card>

          <div className="ax-grid ax-g2">
            {d.cash ? (
              <Card title="Деньги в кассах и на счетах" more={{ href: "/admin/work/cash", label: "Касса" }}>
                {d.cash.accounts.length ? (
                  <div className="ax-list">
                    {d.cash.accounts.map((a) => (
                      <div key={a.id} className="ax-list-row">
                        <span className="ax-row-body"><span className="ax-row-t">{a.name}</span></span>
                        <b className="num">{money(a.balance, a.currency === "USD" ? "USD" : a.currency === "CNY" ? "CNY" : "KGS")}</b>
                      </div>
                    ))}
                  </div>
                ) : (
                  <Empty icon="wallet" title="Касс пока нет" text="Добавьте кассу или банковский счёт в настройках компании." action={<ButtonLink href="/admin/settings/company" size="sm">Открыть настройки</ButtonLink>} />
                )}
              </Card>
            ) : null}
            {d.methods.length ? (
              <Card title="Как платят клиенты · 90 дней">
                <div className="ax-stack" aria-hidden>
                  {d.methods.map((m) => <i key={m.key} style={{ width: `${(m.total / methodsTotal) * 100}%`, background: `var(--${METHOD_COLOR[m.key] ?? "sky"})` }} />)}
                </div>
                <div className="ax-legend">
                  {d.methods.map((m) => (
                    <span key={m.key}><i style={{ background: `var(--${METHOD_COLOR[m.key] ?? "sky"})` }} />{METHOD[m.key as keyof typeof METHOD]?.short ?? m.key} · <b className="num">{Math.round((m.total / methodsTotal) * 100)}%</b></span>
                  ))}
                </div>
              </Card>
            ) : null}
            <Card title="Откуда клиенты · 30 дней" more={can("/admin/marketing/analytics") ? { href: "/admin/marketing/analytics", label: "Аналитика" } : undefined}>
              {d.sources.length ? (
                <>
                  <div className="ax-stack" aria-hidden>
                    {d.sources.map((s, i) => (
                      <i key={s.source} style={{ width: `${(s.leads / leadsTotal) * 100}%`, background: `var(--${SOURCE_TONES[i % SOURCE_TONES.length] === "green" ? "brand" : SOURCE_TONES[i % SOURCE_TONES.length]})` }} />
                    ))}
                  </div>
                  <div className="ax-legend">
                    {d.sources.map((s, i) => (
                      <span key={s.source}>
                        <i style={{ background: `var(--${SOURCE_TONES[i % SOURCE_TONES.length] === "green" ? "brand" : SOURCE_TONES[i % SOURCE_TONES.length]})` }} />
                        {sourceLabel(s.source)} · <b className="num">{s.leads}</b>
                      </span>
                    ))}
                  </div>
                </>
              ) : (
                <Empty icon="inbox" tone="teal" title="Заявок за месяц нет" text="Заявки с сайта, WhatsApp и звонков попадут сюда автоматически." />
              )}
            </Card>
          </div>

          {can("/admin/work/sales") ? (
            <Card title="Последние продажи" more={{ href: "/admin/work/sales", label: "Все продажи" }} flush>
              {d.recent.length ? (
                <div className="ax-table-wrap" style={{ border: 0, borderRadius: 0 }}>
                  <table className="ax-table">
                    <tbody>
                      {d.recent.map((r) => {
                        const st = r.status === "closed" ? { t: "Закрыта", tone: "good" as const } : r.status === "delivered" ? { t: "Выдана в долг", tone: "info" as const } : r.paid >= r.amount ? { t: "Оплачена, к выдаче", tone: "good" as const } : { t: "Ждём оплату", tone: "warn" as const };
                        return (
                          <tr key={r.id}>
                            <td><Link href={`/admin/work/sales/${r.id}`} className="ax-strong">{r.customer}</Link><div className="ax-small">{r.number} · {r.items}</div></td>
                            <td className="ax-small">{fmtDate(r.sold_at)}</td>
                            <td className="r num ax-strong">{money(r.amount, r.currency)}</td>
                            <td><Badge tone={st.tone}>{st.t}</Badge></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <Empty icon="cart" title="Продаж пока нет" text="Оформите продажу: клиент, техника, способ оплаты." action={<ButtonLink href="/admin/work/sales/new" variant="primary" size="sm">Новая продажа</ButtonLink>} />
              )}
            </Card>
          ) : null}
        </div>

        <Card title={<>Требует внимания {d.attention.length ? <Badge tone="bad">{d.attention.length}</Badge> : null}</>}>
          {d.attention.length ? (
            <div className="ax-list">
              {d.attention.filter((a) => can(a.href)).map((a) => (
                <Link key={a.key} href={a.href} className="ax-list-row">
                  <IconTile icon={a.icon} tone={a.tone} small />
                  <span className="ax-row-body"><span className="ax-row-t">{a.title}</span><span className="ax-row-s">{a.hint}</span></span>
                  <ChevronRight size={18} className="ax-muted" aria-hidden />
                </Link>
              ))}
            </div>
          ) : (
            <Empty icon="bell" tone="green" title="Всё под контролем" text="Срочных дел нет: заявки отвечены, долги и поставки в срок." />
          )}
          {seesCost(actor) ? null : <p className="ax-small" style={{ margin: "12px 4px 0" }}>Себестоимость и маржа видны владельцу, директору и бухгалтеру.</p>}
        </Card>
      </div>
    </>
  );
}
