import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { requireSection } from "../../../_lib/session";
import { listModels, MODEL_STATUS } from "../../../_lib/catalog-admin";
import { Badge, ButtonLink, Empty, PageHeader } from "../../../_ui/ui";

export const metadata = { title: "Каталог техники" };
const TABS = [
  { key: "", label: "Все" },
  { key: "published", label: "На сайте" },
  { key: "draft", label: "Черновики" },
  { key: "hidden", label: "Скрытые" },
  { key: "archived", label: "Архив" },
];
const som = (n: number | null | undefined) => (n ? `${n.toLocaleString("ru-RU")} с` : "по запросу");

export default async function Catalog({ searchParams }: PageProps<"/admin/marketing/catalog">) {
  await requireSection("/admin/marketing/catalog");
  const sp = await searchParams;
  const tab = typeof sp.status === "string" ? sp.status : "";
  const q = typeof sp.q === "string" ? sp.q.trim().toLowerCase().slice(0, 60) : "";
  const all = await listModels();
  const counts = Object.fromEntries(TABS.map((t) => [t.key, t.key ? all.filter((m) => m.status === t.key).length : all.filter((m) => m.status !== "archived").length]));
  const rows = all.filter((m) => (tab ? m.status === tab : m.status !== "archived") && (!q || m.model.toLowerCase().includes(q) || m.slug.includes(q) || String(m.hp) === q));

  return (
    <>
      <PageHeader title="Каталог техники" subtitle="Модели на atadan.kg: цены, фото, характеристики и видимость. Наличие считается со склада." actions={<><ButtonLink href="/admin/work/prices">Прайс и себестоимость</ButtonLink><ButtonLink href="/admin/marketing/catalog/new" variant="primary"><Plus size={17} aria-hidden />Новая модель</ButtonLink></>} />
      <nav className="ax-tabs" aria-label="Статус">
        {TABS.map((t) => <Link key={t.key} href={`/admin/marketing/catalog${t.key ? `?status=${t.key}` : ""}`} aria-current={tab === t.key ? "page" : undefined}>{t.label}<span>{counts[t.key]}</span></Link>)}
      </nav>
      <form role="search" style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        {tab ? <input type="hidden" name="status" value={tab} /> : null}
        <input name="q" defaultValue={q} className="ax-input" style={{ maxWidth: 280 }} placeholder="Модель или мощность" aria-label="Поиск" />
        <button className="ax-btn"><Search size={16} aria-hidden />Найти</button>
      </form>
      {rows.length ? (
        <>
          <div className="ax-only-phone">
            {rows.map((m) => (
              <Link key={m.slug} href={`/admin/marketing/catalog/${m.slug}`} className="ax-card ax-mcard" style={{ display: "grid", gridTemplateColumns: "54px minmax(0,1fr)", gap: 10 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {m.image ? <img src={m.image} alt="" className="ax-thumb" /> : <span className="ax-thumb" />}
                <span>
                  <span className="ax-mcard-l1"><span>{m.model}</span><span className="num">{som(m.price)}</span></span>
                  <span className="ax-small">{m.hp} л.с. · {m.category} · склад {m.stock}{m.transit ? `, в пути ${m.transit}` : ""}</span>
                  <span className="ax-mcard-l3"><Badge tone={MODEL_STATUS[m.status].tone}>{MODEL_STATUS[m.status].label}</Badge>{m.custom ? <Badge tone="info">новая</Badge> : null}</span>
                </span>
              </Link>
            ))}
          </div>
          <div className="ax-table-wrap ax-only-desktop">
            <table className="ax-table">
              <thead><tr><th /><th>Модель</th><th>Класс</th><th className="r">Цена</th><th className="r">≈ $</th><th className="r">Склад</th><th>Статус</th></tr></thead>
              <tbody>
                {rows.map((m) => (
                  <tr key={m.slug}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <td style={{ width: 66 }}>{m.image ? <img src={m.image} alt="" className="ax-thumb" /> : <span className="ax-thumb" />}</td>
                    <td><Link href={`/admin/marketing/catalog/${m.slug}`} className="ax-strong">{m.model}</Link><div className="ax-small">{m.hp} л.с. · {m.slug}</div></td>
                    <td className="ax-small">{m.category}{m.farmArea ? <div>{m.farmArea}</div> : null}</td>
                    <td className="r num">{som(m.price)}{m.discountPercent ? <div className="ax-small">скидка {m.discountPercent}%</div> : null}</td>
                    <td className="r num">{m.approximatePriceUsd ? `$${m.approximatePriceUsd.toLocaleString("ru-RU")}` : ""}</td>
                    <td className="r num">{m.stock}{m.transit || m.reserved ? <div className="ax-small">{[m.transit ? `в пути ${m.transit}` : "", m.reserved ? `резерв ${m.reserved}` : ""].filter(Boolean).join(", ")}</div> : null}</td>
                    <td><Badge tone={MODEL_STATUS[m.status].tone}>{MODEL_STATUS[m.status].label}</Badge>{m.custom ? <> <Badge tone="info">новая</Badge></> : null}{m.status === "published" && !m.image ? <div className="ax-small ax-down">нет фото</div> : null}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : <div className="ax-card"><Empty icon="tractor" title={q ? "Ничего не нашлось" : "Здесь пусто"} text="Добавьте модель: название, мощность, фото и цену." action={<ButtonLink href="/admin/marketing/catalog/new" variant="primary">Новая модель</ButtonLink>} /></div>}
    </>
  );
}
