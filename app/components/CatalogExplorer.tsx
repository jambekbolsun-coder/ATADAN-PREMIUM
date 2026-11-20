"use client";

import { powerRanges } from "../lib/customer-input";
import { ArrowRight, ChevronDown, MessageCircle, Scale, Search, SlidersHorizontal, Sparkles, X } from "lucide-react";
import Image from "next/image";
import { useDeferredValue, useMemo, useRef, useState } from "react";
import type { Tractor } from "../types";
import { TractorCard } from "./TractorCard";
import { Link } from "./SiteLink";
import { useI18n } from "./I18n";
import { useSiteSettings } from "./SiteSettings";
import { localizeTractor } from "../lib/tractor-localization";
import { formatApproximateUsdPrice, formatPrice } from "../lib/format";
import { leasePreview } from "../lib/lease-preview";
import { salePrice, type LeasePublicConfig } from "../lib/leasing";
import type { UsdKgsRate } from "../lib/exchange-rate";
import { fitsLand, tractorCabin, tractorGearbox, tractorKw, tractorLiftKn, tractorMassKg, tractorMaxSpeed, tractorTractionKn } from "../lib/tractor-facts";

/** Сколько земли у клиента. Трактор подходит, если его диапазон площади пересекается с выбранным. */
const LANDS: Array<{ id: string; range: [number, number] }> = [
  { id: "30", range: [0, 30] },
  { id: "60", range: [30, 60] },
  { id: "120", range: [60, 120] },
  { id: "250", range: [120, 250] },
  { id: "more", range: [250, Infinity] },
];
const MONTHLY = [15000, 25000, 40000];
const SORTS = ["recommended", "priceAsc", "priceDesc", "monthlyAsc", "hpDesc"] as const;
type Sort = (typeof SORTS)[number];
const COMPARE_MAX = 3;
const emptyConfig: LeasePublicConfig = { programs: [], models: [], promotions: [], maxMonths: 84 };

export function CatalogExplorer({
  tractors,
  initialPower,
  initialQuery = "",
  initialPopular = false,
  initialCompare = [],
  config = emptyConfig,
  usdKgsRate = null,
}: {
  tractors: Tractor[];
  initialPower?: number;
  initialQuery?: string;
  initialPopular?: boolean;
  initialCompare?: string[];
  config?: LeasePublicConfig;
  usdKgsRate?: UsdKgsRate | null;
}) {
  const { t, locale } = useI18n();
  const settings = useSiteSettings();
  const numberLocale = locale === "en" ? "en-US" : "ru-RU";
  const fmt = (value: number, digits = 0) => new Intl.NumberFormat(numberLocale, { maximumFractionDigits: digits }).format(value);

  // Цифры по каждому трактору считаем один раз: платёж в месяц, цена в долларах, кабина, коробка.
  const facts = useMemo(() => {
    const map = new Map<string, { preview: ReturnType<typeof leasePreview>; usd: number | null; cabin: ReturnType<typeof tractorCabin>; gearbox: string | null }>();
    for (const tractor of tractors) {
      const som = salePrice(tractor.price, tractor.discountPercent ?? 0);
      const usd = som && usdKgsRate?.value ? Math.round(som / usdKgsRate.value) : tractor.approximatePriceUsd ?? null;
      map.set(tractor.slug, { preview: leasePreview(tractor, config, usdKgsRate), usd, cabin: tractorCabin(tractor), gearbox: tractorGearbox(tractor) });
    }
    return map;
  }, [tractors, config, usdKgsRate]);
  const fact = (tractor: Tractor) => facts.get(tractor.slug)!;
  const hasPreviews = [...facts.values()].some((item) => item.preview);
  const prices = [...facts.values()].map((item) => item.usd).filter((v): v is number => Boolean(v));
  const priceMin = prices.length ? Math.floor(Math.min(...prices) / 1000) * 1000 : 0;
  const priceTop = prices.length ? Math.ceil(Math.max(...prices) / 1000) * 1000 : 0;
  const gearboxes = [...new Set([...facts.values()].map((item) => item.gearbox).filter((v): v is string => Boolean(v)))].sort((a, b) => Number.parseInt(a, 10) - Number.parseInt(b, 10));
  const hasCabinData = [...facts.values()].some((item) => item.cabin);

  const [query, setQuery] = useState(initialQuery);
  const [power, setPower] = useState(() => (initialPower ? powerRanges.findIndex((item) => initialPower >= item.min && initialPower <= item.max) : -1));
  const [land, setLand] = useState("");
  const [monthly, setMonthly] = useState(0);
  const [priceMax, setPriceMax] = useState(0);
  const [stockOnly, setStockOnly] = useState(false);
  const [saleOnly, setSaleOnly] = useState(false);
  const [popularOnly, setPopularOnly] = useState(initialPopular);
  const [cabinOnly, setCabinOnly] = useState(false);
  const [gearbox, setGearbox] = useState("");
  const [sort, setSort] = useState<Sort>("recommended");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [compare, setCompare] = useState<string[]>(() => initialCompare.filter((slug) => tractors.some((item) => item.slug === slug)).slice(0, COMPARE_MAX));
  const [wizardStep, setWizardStep] = useState(0);
  const [wizard, setWizard] = useState<{ land: string; monthly: number; cabin: "" | "yes" | "any" }>({ land: "", monthly: 0, cabin: "" });
  const wizardRef = useRef<HTMLDialogElement>(null);
  const compareRef = useRef<HTMLDialogElement>(null);
  const deferredQuery = useDeferredValue(query);

  const filtered = useMemo(() => {
    const markedPopular = tractors.some((item) => item.popular);
    const landRange = LANDS.find((item) => item.id === land)?.range;
    const range = power >= 0 ? powerRanges[power] : null;
    const list = tractors.filter((tractor) => {
      const f = facts.get(tractor.slug)!;
      if (deferredQuery && !tractor.model.toLowerCase().includes(deferredQuery.toLowerCase().replace(/^changfa\s*/, ""))) return false;
      if (range && !(tractor.hp >= range.min && (range.max >= 999 ? true : tractor.hp < range.max))) return false;
      if (landRange && !fitsLand(tractor, landRange)) return false;
      if (monthly && !(f.preview && f.preview.monthly <= monthly)) return false;
      if (priceMax && !(f.usd && f.usd <= priceMax)) return false;
      if (stockOnly && !tractor.inStock) return false;
      if (saleOnly && !(tractor.discountPercent && tractor.price)) return false;
      if (popularOnly && !(markedPopular ? tractor.popular : tractor.hp >= 200)) return false;
      if (cabinOnly && !(f.cabin === "cab" || f.cabin === "both")) return false;
      if (gearbox && f.gearbox !== gearbox) return false;
      return true;
    });
    const value = (tractor: Tractor, key: "usd" | "monthly") => (key === "usd" ? facts.get(tractor.slug)!.usd : facts.get(tractor.slug)!.preview?.monthly) ?? null;
    const byValue = (key: "usd" | "monthly", dir: 1 | -1) => (a: Tractor, b: Tractor) => {
      const va = value(a, key), vb = value(b, key);
      if (va === null) return vb === null ? 0 : 1;
      if (vb === null) return -1;
      return (va - vb) * dir;
    };
    if (sort === "priceAsc") return list.sort(byValue("usd", 1));
    if (sort === "priceDesc") return list.sort(byValue("usd", -1));
    if (sort === "monthlyAsc") return list.sort(byValue("monthly", 1));
    if (sort === "hpDesc" || popularOnly) return list.sort((a, b) => b.hp - a.hp);
    return list;
  }, [tractors, facts, deferredQuery, power, land, monthly, priceMax, stockOnly, saleOnly, popularOnly, cabinOnly, gearbox, sort]);

  const landLabel = (id: string) => t(`ui.cat.land.${id}`);
  const monthlyLabel = (value: number) => t("ui.cat.monthlyUpTo", { sum: fmt(value) });
  const powerLabel = (index: number) => {
    const item = powerRanges[index];
    return item.max >= 999 ? `${item.min}+ ${t("common.hp")}` : `${item.min}–${item.max} ${t("common.hp")}`;
  };
  const active: Array<{ key: string; label: string; clear: () => void }> = [
    land ? { key: "land", label: landLabel(land), clear: () => setLand("") } : null,
    monthly ? { key: "monthly", label: monthlyLabel(monthly), clear: () => setMonthly(0) } : null,
    priceMax ? { key: "price", label: t("ui.cat.priceUpTo", { sum: `$${fmt(priceMax)}` }), clear: () => setPriceMax(0) } : null,
    power >= 0 ? { key: "power", label: powerLabel(power), clear: () => setPower(-1) } : null,
    stockOnly ? { key: "stock", label: t("ui.cat.stock"), clear: () => setStockOnly(false) } : null,
    saleOnly ? { key: "sale", label: t("ui.cat.sale"), clear: () => setSaleOnly(false) } : null,
    popularOnly ? { key: "popular", label: t("ui.catalog.popular"), clear: () => setPopularOnly(false) } : null,
    cabinOnly ? { key: "cabin", label: t("ui.cat.cabinOnly"), clear: () => setCabinOnly(false) } : null,
    gearbox ? { key: "gearbox", label: `${t("ui.card.gearbox")} ${gearbox}`, clear: () => setGearbox("") } : null,
    query ? { key: "query", label: `«${query}»`, clear: () => setQuery("") } : null,
  ].filter((item): item is { key: string; label: string; clear: () => void } => Boolean(item));
  function resetAll() {
    setQuery(""); setPower(-1); setLand(""); setMonthly(0); setPriceMax(0); setStockOnly(false); setSaleOnly(false); setPopularOnly(false); setCabinOnly(false); setGearbox(""); setSort("recommended");
  }
  function toggleCompare(slug: string) {
    setCompare((current) => (current.includes(slug) ? current.filter((item) => item !== slug) : current.length >= COMPARE_MAX ? current : [...current, slug]));
  }
  function openWizard() {
    setWizardStep(0);
    setWizard({ land, monthly, cabin: cabinOnly ? "yes" : "" });
    wizardRef.current?.showModal();
  }
  function finishWizard(next: typeof wizard, dialog: HTMLDialogElement | null) {
    resetAll();
    setLand(next.land);
    setMonthly(next.monthly);
    setCabinOnly(next.cabin === "yes");
    dialog?.close();
    document.getElementById("catalog-results")?.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
  }
  const compared = compare.map((slug) => tractors.find((item) => item.slug === slug)).filter((item): item is Tractor => Boolean(item));
  const whatsappHelp = `https://wa.me/${settings.phone.replace(/\D/g, "")}?text=${encodeURIComponent("Здравствуйте! Помогите подобрать трактор Changfa под моё хозяйство.")}`;

  const chip = (on: boolean, label: string, onClick: () => void, key: string) => (
    <button type="button" key={key} className={`filter-chip${on ? " is-on" : ""}`} aria-pressed={on} onClick={onClick}>{label}</button>
  );

  const renderFilters = (scope: "desktop" | "mobile") => (
    <>
      <div className="filter-title">
        <strong>{t("ui.cat.title")}</strong>
        {active.length ? <button type="button" className="filter-reset-link" onClick={resetAll}>{t("ui.cat.reset")}</button> : null}
        <button type="button" className="filter-close" onClick={() => setFiltersOpen(false)} aria-label={t("catalog.closeFilters")}>
          <X size={20} />
        </button>
      </div>
      <fieldset>
        <legend>{t("ui.cat.landQ")}</legend>
        <div className="filter-chips">{LANDS.map((item) => chip(land === item.id, landLabel(item.id), () => setLand(land === item.id ? "" : item.id), `${scope}-land-${item.id}`))}</div>
      </fieldset>
      {hasPreviews ? (
        <fieldset>
          <legend>{t("ui.cat.monthlyQ")}</legend>
          <div className="filter-chips">
            {MONTHLY.map((value) => chip(monthly === value, monthlyLabel(value), () => setMonthly(monthly === value ? 0 : value), `${scope}-m-${value}`))}
            {chip(!monthly, t("ui.cat.any"), () => setMonthly(0), `${scope}-m-any`)}
          </div>
          <small className="filter-hint">{t("ui.cat.monthlyHint")}</small>
        </fieldset>
      ) : null}
      {priceTop > priceMin ? (
        <fieldset>
          <legend>{t("ui.cat.priceQ")}</legend>
          <input
            type="range"
            min={priceMin}
            max={priceTop}
            step={1000}
            value={priceMax || priceTop}
            onChange={(event) => { const value = Number(event.target.value); setPriceMax(value >= priceTop ? 0 : value); }}
            aria-label={t("ui.cat.priceQ")}
            aria-valuetext={priceMax ? t("ui.cat.priceUpTo", { sum: `$${fmt(priceMax)}` }) : t("ui.cat.any")}
          />
          <div className="filter-range-values"><span>${fmt(priceMin)}</span><strong>{priceMax ? t("ui.cat.priceUpTo", { sum: `$${fmt(priceMax)}` }) : t("ui.cat.anyPrice")}</strong></div>
        </fieldset>
      ) : null}
      <fieldset>
        <legend>{t("ui.cat.powerQ")}</legend>
        <div className="filter-chips">{powerRanges.map((_, index) => chip(power === index, powerLabel(index), () => setPower(power === index ? -1 : index), `${scope}-p-${index}`))}</div>
      </fieldset>
      <fieldset>
        <legend>{t("catalog.availability")}</legend>
        <label className="switch-row"><input type="checkbox" checked={stockOnly} onChange={(event) => setStockOnly(event.target.checked)} /><span>{t("ui.cat.stock")}</span></label>
        <label className="switch-row"><input type="checkbox" checked={saleOnly} onChange={(event) => setSaleOnly(event.target.checked)} /><span>{t("ui.cat.sale")}</span></label>
      </fieldset>
      <details className="filter-more" open={cabinOnly || Boolean(gearbox) || popularOnly || undefined}>
        <summary>{t("ui.cat.more")}<ChevronDown size={17} aria-hidden /></summary>
        {hasCabinData ? <label className="switch-row"><input type="checkbox" checked={cabinOnly} onChange={(event) => setCabinOnly(event.target.checked)} /><span>{t("ui.cat.cabinOnly")}</span></label> : null}
        <label className="switch-row"><input type="checkbox" checked={popularOnly} onChange={(event) => setPopularOnly(event.target.checked)} /><span>{t("ui.catalog.popular")}</span></label>
        {gearboxes.length > 1 ? (
          <div className="filter-sub">
            <span>{t("ui.card.gearbox")}</span>
            <div className="filter-chips">{gearboxes.map((value) => chip(gearbox === value, value, () => setGearbox(gearbox === value ? "" : value), `${scope}-g-${value}`))}</div>
          </div>
        ) : null}
      </details>
      <button className="primary-btn filter-apply" type="button" onClick={() => setFiltersOpen(false)}>{t("ui.cat.show", { count: filtered.length })}</button>
    </>
  );

  const compareRows: Array<[string, (tractor: Tractor) => string]> = [
    [t("ui.card.price"), (x) => { const sp = salePrice(x.price, x.discountPercent ?? 0); return sp ? formatPrice(sp, locale) : formatApproximateUsdPrice(x.approximatePriceUsd, locale); }],
    [t("ui.cat.cmp.lease"), (x) => { const p = fact(x).preview; return p ? `${t("ui.card.perMonth", { sum: fmt(p.monthly) })} · ${t("ui.cat.cmp.down", { p: fmt(p.downPercent, 1) })}` : "–"; }],
    [t("ui.card.power"), (x) => { const kw = tractorKw(x); return `${x.hp} ${t("common.hp")}${kw ? ` · ${fmt(kw, 1)} ${t("ui.cat.kw")}` : ""}`; }],
    [t("ui.cat.cmp.field"), (x) => localizeTractor(x, locale).farmArea],
    [t("ui.card.mass"), (x) => { const v = tractorMassKg(x); return v ? `${fmt(v)} ${t("ui.card.kg")}` : "–"; }],
    [t("ui.card.gearbox"), (x) => fact(x).gearbox ?? "–"],
    [t("ui.card.cabin"), (x) => { const c = fact(x).cabin; return c ? t(`ui.card.cabin.${c}`) : "–"; }],
    [t("ui.card.traction"), (x) => { const v = tractorTractionKn(x); return v ? `${fmt(v, 1)} ${t("ui.card.kn")}` : "–"; }],
    [t("ui.cat.cmp.lift"), (x) => { const v = tractorLiftKn(x); return v ? `${fmt(v, 1)} ${t("ui.card.kn")}` : "–"; }],
    [t("ui.cat.cmp.speed"), (x) => { const v = tractorMaxSpeed(x); return v ? t("ui.cat.speedUpTo", { n: v }) : "–"; }],
    [t("catalog.availability"), (x) => (x.inStock ? (x.availableUnits ? t("ui.card.stockCount", { n: x.availableUnits }) : t("product.inStock")) : t("product.onOrder"))],
  ];

  return (
    <div className="catalog-explorer catalog-explorer-v4">
      <aside className="catalog-filters">{renderFilters("desktop")}</aside>
      <div className={`filters-sheet ${filtersOpen ? "is-open" : ""}`}>
        <button type="button" className="filters-backdrop" onClick={() => setFiltersOpen(false)} aria-label={t("catalog.closeFilters")} />
        <div className="filters-panel">{renderFilters("mobile")}</div>
      </div>
      <section className="catalog-results" id="catalog-results">
        <div className="catalog-helper">
          <Sparkles size={22} aria-hidden />
          <div>
            <strong>{t("ui.cat.helperTitle")}</strong>
            <span>{t("ui.cat.helperText")}</span>
          </div>
          <button type="button" onClick={openWizard}>{t("ui.cat.helperCta")}<ArrowRight size={17} aria-hidden /></button>
        </div>
        <div className="catalog-toolbar">
          <label className="search-box">
            <Search size={19} />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t("catalog.search")} aria-label={t("catalog.search")} />
          </label>
          <button className="mobile-filter-btn" type="button" onClick={() => setFiltersOpen(true)}>
            <SlidersHorizontal size={18} /> {t("catalog.filters")}{active.length ? ` · ${active.length}` : ""}
          </button>
          <label className="catalog-sort">
            <span>{t("ui.cat.sort")}</span>
            <select value={sort} onChange={(event) => setSort(event.target.value as Sort)}>
              {SORTS.filter((item) => item !== "monthlyAsc" || hasPreviews).map((item) => <option value={item} key={item}>{t(`ui.cat.sort.${item}`)}</option>)}
            </select>
          </label>
        </div>
        <div className="catalog-active">
          <span className="catalog-count" role="status" aria-live="polite">{t("ui.cat.found", { count: filtered.length })}</span>
          {active.map((item) => (
            <button type="button" className="filter-chip is-on is-removable" key={item.key} onClick={item.clear} aria-label={t("ui.cat.removeFilter", { name: item.label })}>
              {item.label}<X size={14} aria-hidden />
            </button>
          ))}
        </div>
        {filtered.length ? (
          <div className="catalog-grid">
            {filtered.map((tractor) => (
              <TractorCard
                tractor={tractor}
                key={tractor.slug}
                preview={fact(tractor).preview}
                compare={{ active: compare.includes(tractor.slug), full: compare.length >= COMPARE_MAX, onToggle: () => toggleCompare(tractor.slug) }}
              />
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <Search size={28} />
            <h3>{t("ui.cat.emptyTitle")}</h3>
            <p>{t("ui.cat.emptyText")}</p>
            <div className="empty-actions">
              <button type="button" className="primary-btn" onClick={resetAll}>{t("ui.cat.reset")}</button>
              <a className="ghost-btn" href={whatsappHelp} target="_blank" rel="noopener noreferrer"><MessageCircle size={18} aria-hidden />{t("ui.cat.emptyHelp")}</a>
            </div>
          </div>
        )}
      </section>

      {compare.length ? (
        <div className="compare-tray" role="region" aria-label={t("ui.cat.cmp.title")}>
          <Scale size={19} aria-hidden />
          <span>{t("ui.cat.cmp.tray", { n: compare.length, max: COMPARE_MAX })}</span>
          <ul>
            {compared.map((item) => (
              <li key={item.slug}>{item.model}<button type="button" onClick={() => toggleCompare(item.slug)} aria-label={t("ui.card.compareRemove", { model: item.model })}><X size={14} aria-hidden /></button></li>
            ))}
          </ul>
          <button type="button" className="primary-btn" onClick={() => compareRef.current?.showModal()} disabled={compare.length < 2} title={compare.length < 2 ? t("ui.cat.cmp.needTwo") : undefined}>
            {compare.length < 2 ? t("ui.cat.cmp.needTwo") : t("ui.cat.cmp.open")}
          </button>
        </div>
      ) : null}

      <dialog ref={compareRef} className="site-dialog compare-dialog" aria-labelledby="compare-title">
        <div className="site-dialog-inner">
          <header>
            <h2 id="compare-title">{t("ui.cat.cmp.title")}</h2>
            <button type="button" className="dialog-close" onClick={() => compareRef.current?.close()} aria-label={t("ui.common.close")}><X size={20} /></button>
          </header>
          <div className="compare-scroll">
            <table className="compare-table">
              <thead>
                <tr>
                  <th scope="col"><span className="sr-only">{t("ui.cat.cmp.param")}</span></th>
                  {compared.map((item) => (
                    <th scope="col" key={item.slug}>
                      <Image src={item.image} alt="" width={160} height={120} />
                      <strong>Changfa {item.model}</strong>
                      <Link href={`/catalog/${item.slug}`}>{t("product.details")}</Link>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {compareRows.map(([label, value]) => (
                  <tr key={label}>
                    <th scope="row">{label}</th>
                    {compared.map((item) => <td key={item.slug}>{value(item)}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </dialog>

      <dialog ref={wizardRef} className="site-dialog wizard-dialog" aria-labelledby="wizard-title">
        <div className="site-dialog-inner">
          <header>
            <div>
              <small>{t("ui.cat.wiz.step", { n: wizardStep + 1, total: 3 })}</small>
              <h2 id="wizard-title">{t(["ui.cat.landQ", "ui.cat.monthlyQ", "ui.cat.wiz.cabinQ"][wizardStep])}</h2>
            </div>
            <button type="button" className="dialog-close" onClick={() => wizardRef.current?.close()} aria-label={t("ui.common.close")}><X size={20} /></button>
          </header>
          <div className="wizard-progress" aria-hidden><i style={{ transform: `scaleX(${(wizardStep + 1) / 3})` }} /></div>
          <div className="wizard-options">
            {wizardStep === 0 ? LANDS.map((item) => (
              <button type="button" key={item.id} className={wizard.land === item.id ? "is-on" : ""} onClick={() => { setWizard({ ...wizard, land: item.id }); setWizardStep(1); }}>{landLabel(item.id)}</button>
            )) : null}
            {wizardStep === 1 ? [...(hasPreviews ? MONTHLY : []), 0].map((value) => (
              <button type="button" key={value} className={wizard.monthly === value ? "is-on" : ""} onClick={() => { setWizard({ ...wizard, monthly: value }); setWizardStep(2); }}>{value ? monthlyLabel(value) : t(hasPreviews ? "ui.cat.wiz.anyBudget" : "ui.cat.wiz.next")}</button>
            )) : null}
            {wizardStep === 2 ? (["yes", "any"] as const).map((value) => (
              <button type="button" key={value} className={wizard.cabin === value ? "is-on" : ""} onClick={(event) => finishWizard({ ...wizard, cabin: value }, event.currentTarget.closest("dialog"))}>{t(`ui.cat.wiz.cabin.${value}`)}</button>
            )) : null}
          </div>
          <footer>
            {wizardStep > 0 ? <button type="button" className="ghost-btn" onClick={() => setWizardStep(wizardStep - 1)}>{t("ui.cat.wiz.back")}</button> : <span />}
            <span className="wizard-note">{t("ui.cat.wiz.note")}</span>
          </footer>
        </div>
      </dialog>
    </div>
  );
}
