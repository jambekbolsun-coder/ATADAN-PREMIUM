import Link from "next/link";
import { requireSection } from "../../../_lib/session";
import { analytics } from "../../../_lib/site-admin";
import { listModels } from "../../../_lib/catalog-admin";
import { percent } from "../../../_lib/format";
import { Card, Empty, Notice, PageHeader, Progress } from "../../../_ui/ui";

export const metadata = { title: "Аналитика сайта" };
const PERIODS = [{ d: 7, label: "7 дней" }, { d: 30, label: "30 дней" }, { d: 90, label: "90 дней" }];
const PAGE_NAMES: Record<string, string> = { "/": "Главная", "/catalog": "Каталог", "/finance": "Лизинг и калькулятор", "/contacts": "Контакты", "/news": "АгроЖурнал", "/service": "Сервис" };

export default async function Analytics({ searchParams }: PageProps<"/admin/marketing/analytics">) {
  await requireSection("/admin/marketing/analytics");
  const sp = await searchParams;
  const days = PERIODS.find((p) => String(p.d) === sp.days)?.d ?? 30;
  const [a, models] = await Promise.all([analytics(days), listModels()]);
  const name = (slug: string) => models.find((m) => m.slug === slug)?.model ?? slug;
  const maxDay = Math.max(1, ...a.daily.map((d) => d.views));
  const bars = a.daily.slice(-31);
  const maxModel = Math.max(1, ...a.models.map((m) => m.views + m.interest));

  return (
    <>
      <PageHeader title="Аналитика сайта" subtitle="Считаются только посетители, согласившиеся на аналитику в баннере cookies. Повторы одного посетителя за день не считаются." />
      <nav className="ax-tabs" aria-label="Период">{PERIODS.map((p) => <Link key={p.d} href={`/admin/marketing/analytics?days=${p.d}`} aria-current={p.d === days ? "page" : undefined}>{p.label}</Link>)}</nav>
      <div className="ax-grid ax-g3" style={{ marginBottom: 14 }}>
        <div className="ax-card ax-kpi ax-k-sky"><div className="ax-kpi-l">Посетители</div><div className="ax-kpi-v num">{a.totals.visitors.toLocaleString("ru-RU")}</div><div className="ax-kpi-h">уникальные за {days} дней</div></div>
        <div className="ax-card ax-kpi ax-k-green"><div className="ax-kpi-l">Просмотры страниц</div><div className="ax-kpi-v num">{a.totals.views.toLocaleString("ru-RU")}</div></div>
        <Link href="/admin/work/leads" className="ax-card ax-kpi ax-k-terra"><div className="ax-kpi-l">Заявки</div><div className="ax-kpi-v num">{a.totals.leads}</div><div className="ax-kpi-h">{a.totals.visitors ? `конверсия ${percent(a.totals.leads, a.totals.visitors)}` : "нет посетителей"} →</div></Link>
      </div>
      {!a.totals.views ? <div style={{ marginBottom: 14 }}><Notice tone="info">За этот период данных нет. Сайт ещё не запущен для клиентов или посетители не дали согласие на аналитику.</Notice></div> : null}
      {bars.length ? (
        <Card title="Просмотры по дням">
          <div className="ax-bars" role="img" aria-label="Просмотры по дням">
            {bars.map((d, i) => <div key={d.day} className={i === bars.length - 1 ? "is-cur" : undefined}><b>{d.views}</b><i style={{ height: `${(d.views / maxDay) * 100}%` }} /><small>{d.day.slice(8)}</small></div>)}
          </div>
        </Card>
      ) : null}
      <div className="ax-grid ax-g2" style={{ marginTop: 14 }}>
        <Card title="Интерес к моделям">
          {a.models.length ? (
            <div style={{ display: "grid", gap: 10 }}>
              {a.models.map((m) => (
                <Link key={m.slug} href={`/admin/marketing/catalog/${m.slug}`} style={{ display: "grid", gap: 4 }}>
                  <span className="ax-row-line"><span>{name(m.slug)}</span><span className="ax-small num">{m.views} просм. · {m.interest} расчётов</span></span>
                  <Progress value={m.views + m.interest} max={maxModel} />
                </Link>
              ))}
            </div>
          ) : <Empty icon="tractor" title="Пока нет данных" />}
        </Card>
        <Card title="Откуда заявки">
          {a.sources.length ? a.sources.map((s) => <div key={s.source} className="ax-row-line"><span>{s.source}</span><b className="num">{s.leads}</b></div>) : <p className="ax-small" style={{ margin: 0 }}>Заявок за период нет.</p>}
        </Card>
        <Card title="Популярные страницы">
          {a.pages.length ? a.pages.map((p) => <div key={p.path} className="ax-row-line"><span className="ax-small">{PAGE_NAMES[p.path] ?? p.path}</span><b className="num">{p.views}</b></div>) : <p className="ax-small" style={{ margin: 0 }}>Нет данных.</p>}
        </Card>
        <Card title="Регионы">
          {a.regions.length ? a.regions.map((r) => <div key={r.region} className="ax-row-line"><span>{r.region}</span><b className="num">{r.visitors}</b></div>) : <p className="ax-small" style={{ margin: 0 }}>Нет данных.</p>}
        </Card>
      </div>
    </>
  );
}
