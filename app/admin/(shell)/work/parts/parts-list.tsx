import Link from "next/link";
import { Plus, Search } from "lucide-react";
import type { Actor } from "../../../../lib/admin-auth";
import { listParts, partStats, seesPartCost } from "../../../_lib/parts";
import { listModels } from "../../../_lib/catalog-admin";
import { money } from "../../../_lib/format";
import { Badge, ButtonLink, Empty, PageHeader } from "../../../_ui/ui";

/** Список запчастей. Один и тот же для склада (Работа) и для сайта (Маркетинг). */
export async function PartsList({ actor, base, sp, mode }: { actor: Actor; base: string; sp: Record<string, string | string[] | undefined>; mode: "stock" | "site" }) {
  const str = (k: string) => (typeof sp[k] === "string" ? String(sp[k]) : "");
  const filter = str("filter") || (mode === "site" ? "" : "");
  const q = str("q").slice(0, 60);
  const model = str("model");
  const [rows, stats, models] = await Promise.all([listParts({ q, filter, model }), partStats(), listModels()]);
  const cost = seesPartCost(actor);
  const tabs = mode === "stock"
    ? [{ k: "", l: "Все", n: stats.total }, { k: "low", l: "Пора заказать", n: stats.low }, { k: "out", l: "Нет в наличии", n: stats.out }, { k: "archived", l: "Архив" }]
    : [{ k: "", l: "Все", n: stats.total }, { k: "site", l: "На сайте", n: stats.site }, { k: "archived", l: "Архив" }];
  const href = (patch: Record<string, string>) => { const p = new URLSearchParams(); for (const [k, v] of Object.entries({ filter, q, model, ...patch })) if (v) p.set(k, v); return `${base}${p.toString() ? `?${p}` : ""}`; };

  return (
    <>
      <PageHeader
        title={mode === "stock" ? "Запчасти" : "Каталог запчастей"}
        subtitle={mode === "stock" ? "Остатки, приход, продажа, списание. Одна карточка и для склада, и для сайта." : "Карточки запчастей для сайта: фото, цена, к каким моделям подходит"}
        actions={<ButtonLink href="/admin/work/parts/new" variant="primary"><Plus size={17} aria-hidden />Новая запчасть</ButtonLink>}
      />
      {mode === "stock" ? (
        <div className="ax-grid ax-g4" style={{ marginBottom: 14 }}>
          <div className="ax-card ax-kpi ax-k-green"><div className="ax-kpi-l">Позиций</div><div className="ax-kpi-v num">{stats.total}</div></div>
          <Link href={href({ filter: "low" })} className="ax-card ax-kpi ax-k-sun"><div className="ax-kpi-l">Пора заказать</div><div className={`ax-kpi-v num ${stats.low ? "ax-down" : ""}`}>{stats.low}</div><div className="ax-kpi-h">ниже минимального остатка</div></Link>
          <Link href={href({ filter: "out" })} className="ax-card ax-kpi ax-k-terra"><div className="ax-kpi-l">Нет в наличии</div><div className="ax-kpi-v num">{stats.out}</div></Link>
          {cost ? <div className="ax-card ax-kpi ax-k-teal"><div className="ax-kpi-l">Склад по себестоимости</div><div className="ax-kpi-v num">{money(stats.value)}</div></div> : <div className="ax-card ax-kpi ax-k-teal"><div className="ax-kpi-l">На сайте</div><div className="ax-kpi-v num">{stats.site}</div></div>}
        </div>
      ) : null}
      <nav className="ax-tabs" aria-label="Фильтр">{tabs.map((t) => <Link key={t.k} href={href({ filter: t.k })} aria-current={filter === t.k ? "page" : undefined}>{t.l}{t.n !== undefined ? <span>{t.n}</span> : null}</Link>)}</nav>
      <form role="search" style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
        {filter ? <input type="hidden" name="filter" value={filter} /> : null}
        <input name="q" defaultValue={q} className="ax-input" style={{ maxWidth: 260 }} placeholder="Артикул или название" aria-label="Поиск" />
        <select name="model" defaultValue={model} className="ax-input" style={{ maxWidth: 220 }} aria-label="Модель"><option value="">Все модели</option>{models.filter((m) => m.status !== "archived").map((m) => <option key={m.slug} value={m.slug}>{m.model}</option>)}</select>
        <button className="ax-btn"><Search size={16} aria-hidden />Найти</button>
      </form>
      {rows.length ? (
        <>
          <div className="ax-only-phone">
            {rows.map((p) => (
              <Link key={p.id} href={`/admin/work/parts/${p.id}`} className="ax-card ax-mcard">
                <div className="ax-mcard-l1"><span>{p.name}</span><span className="num">{p.qty} {p.unit}</span></div>
                <div className="ax-small num">{p.sku} · {money(p.price_minor)}{p.location ? ` · ${p.location}` : ""}</div>
                <div className="ax-mcard-l3">{p.min_qty > 0 && p.qty <= p.min_qty ? <Badge tone="warn">пора заказать</Badge> : null}{p.show_on_site ? <Badge tone="good">на сайте</Badge> : null}</div>
              </Link>
            ))}
          </div>
          <div className="ax-table-wrap ax-only-desktop">
            <table className="ax-table">
              <thead><tr><th>Артикул</th><th>Название</th><th>Модели</th><th className="r">Цена</th>{cost ? <th className="r">Себест.</th> : null}<th className="r">Остаток</th><th /></tr></thead>
              <tbody>
                {rows.map((p) => (
                  <tr key={p.id}>
                    <td className="num"><Link href={`/admin/work/parts/${p.id}`} className="ax-strong">{p.sku}</Link></td>
                    <td>{p.name}<div className="ax-small">{p.category}{p.location ? ` · ${p.location}` : ""}</div></td>
                    <td className="ax-small">{p.models.length ? p.models.slice(0, 3).map((s) => models.find((m) => m.slug === s)?.model ?? s).join(", ") + (p.models.length > 3 ? ` +${p.models.length - 3}` : "") : "все"}</td>
                    <td className="r num">{money(p.price_minor)}</td>
                    {cost ? <td className="r num ax-small">{money(p.cost_minor)}</td> : null}
                    <td className={`r num ax-strong ${p.qty === 0 ? "ax-down" : ""}`}>{p.qty} {p.unit}{p.min_qty ? <div className="ax-small">мин. {p.min_qty}</div> : null}</td>
                    <td>{p.min_qty > 0 && p.qty <= p.min_qty ? <Badge tone="warn">заказать</Badge> : null} {p.show_on_site ? <Badge tone="good">сайт</Badge> : null}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : <div className="ax-card"><Empty icon="box" tone="sun" title={q || filter ? "Ничего не нашлось" : "Запчастей пока нет"} text="Добавьте позиции по одной или загрузите списком в Настройки → Экспорт и импорт." action={<ButtonLink href="/admin/work/parts/new" variant="primary">Новая запчасть</ButtonLink>} /></div>}
    </>
  );
}
