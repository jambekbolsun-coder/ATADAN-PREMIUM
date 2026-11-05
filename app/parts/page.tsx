import { Link } from "../components/SiteLink";
import { Package } from "lucide-react";
import { Trans } from "../components/I18n";
import { PageHero } from "../components/PageHero";
import { LeadModalButton } from "../components/LeadModalButton";
import { getRequestLocale } from "../lib/locale-server";
import { pageMetadata } from "../lib/seo";
import { getCatalog } from "../lib/catalog";
import { copy } from "../data/site-copy";

export const dynamic = "force-dynamic";
export async function generateMetadata() { return pageMetadata("parts", "/parts", await getRequestLocale()); }

type PublicPart = { id: string; sku: string; name: string; category: string; models_json: string; unit: string; price_minor: number; qty: number; image: string; description: string };

async function publicParts(model: string, q: string) {
  try {
    const { ensureDb, getRawDb } = await import("../../db");
    await ensureDb();
    const where = ["archived=0", "show_on_site=1"], args: unknown[] = [];
    if (model) { where.push("(models_json='[]' OR models_json LIKE ?)"); args.push(`%"${model.replace(/[%_"\\]/g, "")}"%`); }
    if (q) { where.push("(lower(sku) LIKE ? OR lower(name) LIKE ?)"); const like = `%${q.toLowerCase().replace(/[%_\\]/g, "")}%`; args.push(like, like); }
    const { results } = await getRawDb().prepare(`SELECT id, sku, name, category, models_json, unit, price_minor, qty, image, description FROM parts WHERE ${where.join(" AND ")} ORDER BY category, name LIMIT 300`).bind(...args).all<PublicPart>();
    return results;
  } catch {
    return [];
  }
}

export default async function PartsPage({ searchParams }: PageProps<"/parts">) {
  const sp = await searchParams;
  const model = typeof sp.model === "string" ? sp.model.slice(0, 100) : "";
  const q = typeof sp.q === "string" ? sp.q.trim().slice(0, 60) : "";
  const [parts, catalog, locale] = await Promise.all([publicParts(model, q), getCatalog(), getRequestLocale()]);
  const t = (k: string) => copy[locale]?.[k] ?? copy.ru[k] ?? k;
  const name = (slug: string) => catalog.find((t) => t.slug === slug)?.model ?? slug;
  const groups = [...new Set(parts.map((p) => p.category))];

  return (
    <main>
      <PageHero image="/images/banners/service.webp" kickerId="parts.kicker" titleId="parts.title" subtitleId="parts.subtitle" />
      <section className="section-shell public-parts">
        <form className="public-parts-filter" action="/parts" method="get">
          <select name="model" defaultValue={model} aria-label={t("parts.fits")}>
            <option value="">{t("parts.allModels")}</option>
            {catalog.map((t) => <option key={t.slug} value={t.slug}>{t.model}</option>)}
          </select>
          <input name="q" defaultValue={q} aria-label={t("parts.search")} placeholder={t("parts.search")} />
          <button type="submit" className="primary-btn"><Trans id="parts.search" /></button>
          {model || q ? <Link href="/parts" className="public-parts-reset"><Trans id="parts.allModels" /></Link> : null}
        </form>
        {parts.length ? groups.map((g) => (
          <div key={g} className="public-parts-group">
            <h2>{g}</h2>
            <div className="public-parts-grid">
              {parts.filter((p) => p.category === g).map((p) => {
                let models: string[] = [];
                try { models = JSON.parse(p.models_json); } catch { models = []; }
                return (
                  <article key={p.id}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {p.image ? <img src={p.image} alt={p.name} loading="lazy" /> : <span className="public-parts-noimg"><Package aria-hidden /></span>}
                    <span className={p.qty > 0 ? "public-parts-stock" : "public-parts-order"}><Trans id={p.qty > 0 ? "parts.inStock" : "parts.onOrder"} /></span>
                    <h3>{p.name}</h3>
                    <p className="public-parts-sku"><Trans id="parts.sku" />: {p.sku}</p>
                    {p.description ? <p>{p.description}</p> : null}
                    <p className="public-parts-fits"><Trans id="parts.fits" />: {models.length ? models.slice(0, 6).map(name).join(", ") + (models.length > 6 ? "…" : "") : <Trans id="parts.forAll" />}</p>
                    <b>{Math.round(Number(p.price_minor) / 100).toLocaleString("ru-RU")} сом</b>
                    <LeadModalButton message={`Запчасть: ${p.name}, артикул ${p.sku}${model ? `, трактор ${name(model)}` : ""}`} />
                  </article>
                );
              })}
            </div>
          </div>
        )) : <p className="public-parts-empty"><Trans id="parts.empty" /></p>}
        <aside className="public-parts-ask">
          <p><Trans id="parts.ask" /></p>
          <LeadModalButton message="Нужна запчасть. Модель трактора и VIN: " />
        </aside>
      </section>
    </main>
  );
}
