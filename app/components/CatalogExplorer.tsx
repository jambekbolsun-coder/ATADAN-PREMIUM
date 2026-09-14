"use client";

import Image from "next/image";
import { PackageSearch, Search, SlidersHorizontal, Tractor as TractorIcon, X } from "lucide-react";
import { useDeferredValue, useMemo, useState } from "react";
import type { Tractor } from "../types";
import { TractorCard } from "./TractorCard";
import { useI18n } from "./I18n";
import type { PublicRecord } from "../lib/public-records";

const ranges = [
  { label: "Все мощности", min: 0, max: 999 },
  { label: "50–80 л.с.", min: 50, max: 80 },
  { label: "90–120 л.с.", min: 90, max: 120 },
  { label: "140–180 л.с.", min: 140, max: 180 },
  { label: "200–240 л.с.", min: 200, max: 240 },
];

export function CatalogExplorer({ tractors, parts=[], initialPower, initialQuery = "", initialPopular = false }: { tractors: Tractor[]; parts?:PublicRecord[]; initialPower?: number; initialQuery?: string; initialPopular?: boolean }) {
  const { t } = useI18n();
  const [query, setQuery] = useState(initialQuery);
  const [range, setRange] = useState(() => {
    if (!initialPower) return 0;
    const found = ranges.findIndex((item, index) => index > 0 && initialPower >= item.min && initialPower <= item.max);
    return found > 0 ? found : 0;
  });
  const [stockOnly, setStockOnly] = useState(false);
  const [popularOnly, setPopularOnly] = useState(initialPopular);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [view,setView]=useState<"tractors"|"parts">("tractors");
  const deferredQuery = useDeferredValue(query);
  const selected = ranges[range];
  const filtered = useMemo(() => tractors.filter((tractor) => {
    const matchesQuery = tractor.model.toLowerCase().includes(deferredQuery.toLowerCase());
    const markedPopular = tractors.some(item=>item.popular);
    const matchesPopular = !popularOnly || (markedPopular ? tractor.popular : tractor.hp >= 200);
    return matchesQuery && matchesPopular && tractor.hp >= selected.min && tractor.hp <= selected.max && (!stockOnly || tractor.inStock);
  }).sort((a,b)=>popularOnly?b.hp-a.hp:0), [tractors, deferredQuery, selected, stockOnly, popularOnly]);
  const filteredParts=useMemo(()=>parts.filter(part=>`${part.title} ${part.subtitle} ${part.data.sku} ${part.data.compatibleModels}`.toLowerCase().includes(deferredQuery.toLowerCase())),[parts,deferredQuery]);

  const renderFilters = (scope: "desktop" | "mobile") => <>
    <div className="filter-title"><strong>{t("catalog.filters")}</strong><button type="button" onClick={() => setFiltersOpen(false)} aria-label={t("catalog.closeFilters")}><X size={20} /></button></div>
    <fieldset><legend>{t("catalog.power")}</legend>{ranges.map((item, index) => <label className="radio-row" key={item.label}><input type="radio" name={`power-${scope}`} checked={range === index} onChange={() => setRange(index)} /><span>{index === 0 ? t("catalog.allPower") : item.label}</span></label>)}</fieldset>
    <fieldset><legend>{t("catalog.availability")}</legend><label className="switch-row"><input type="checkbox" checked={stockOnly} onChange={(event) => setStockOnly(event.target.checked)} /><span>{t("catalog.stockOnly")}</span></label></fieldset>
    <fieldset><legend>Подборка</legend><label className="switch-row"><input type="checkbox" checked={popularOnly} onChange={(event) => setPopularOnly(event.target.checked)} /><span>Популярные модели</span></label></fieldset>
    <button className="reset-filter" type="button" onClick={() => { setRange(0); setStockOnly(false); setPopularOnly(false); setQuery(""); }}>{t("catalog.reset")}</button>
  </>;

  return (
    <div className="catalog-explorer">
      <aside className="catalog-filters">{view==="tractors"?renderFilters("desktop"):<div className="parts-filter-note"><PackageSearch/><strong>Запчасти Changfa</strong><p>Ищите по названию, артикулу или совместимой модели.</p></div>}</aside>
      <div className={`filters-sheet ${filtersOpen ? "is-open" : ""}`}><button type="button" className="filters-backdrop" onClick={() => setFiltersOpen(false)} aria-label={t("catalog.closeFilters")} /><div className="filters-panel">{renderFilters("mobile")}</div></div>
      <section className="catalog-results">
        <div className="catalog-kind-tabs"><button type="button" className={view==="tractors"?"active":""} onClick={()=>setView("tractors")}><TractorIcon/>Тракторы <b>{tractors.length}</b></button><button type="button" className={view==="parts"?"active":""} onClick={()=>{setView("parts");setFiltersOpen(false)}}><PackageSearch/>Запчасти <b>{parts.length}</b></button></div>
        <div className="catalog-toolbar">
          <label className="search-box"><Search size={19} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t("catalog.search")} aria-label={t("catalog.search")} /></label>
          <button className="mobile-filter-btn" type="button" onClick={() => setFiltersOpen(true)}><SlidersHorizontal size={18} /> {t("catalog.filters")}</button>
          <span>{view==="tractors"?t("catalog.models", { count: filtered.length }):`${filteredParts.length} запчастей`}</span>
        </div>
        {view==="tractors"?(filtered.length ? <div className="catalog-grid">{filtered.map((tractor) => <TractorCard tractor={tractor} key={tractor.slug} />)}</div> : <div className="empty-state"><Search size={28} /><h3>{t("catalog.notFound")}</h3><p>{t("catalog.notFoundText")}</p></div>):filteredParts.length?<div className="parts-public-grid">{filteredParts.map(part=><article key={part.id}><div>{part.data.image?<Image src={part.data.image} alt={part.title} width={320} height={220} unoptimized/>:<PackageSearch/>}</div><small>{part.category||"Оригинальная запчасть"}</small><h3>{part.title}</h3><p>{part.subtitle}</p><dl><div><dt>Артикул</dt><dd>{part.data.sku||"Уточнить"}</dd></div><div><dt>Совместимость</dt><dd>{part.data.compatibleModels||"Changfa"}</dd></div></dl><strong>{part.data.price?`${new Intl.NumberFormat("ru-RU").format(Number(part.data.price))} сом`:"Цена по запросу"}</strong><a href="tel:+996706131404">Уточнить наличие</a></article>)}</div>:<div className="empty-state"><PackageSearch/><h3>Запчасти не найдены</h3><p>Измените запрос или свяжитесь с сервисным отделом.</p></div>}
      </section>
    </div>
  );
}
