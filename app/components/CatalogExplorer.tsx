"use client";

import { Search, SlidersHorizontal, X } from "lucide-react";
import { useDeferredValue, useMemo, useState } from "react";
import type { Tractor } from "../types";
import { TractorCard } from "./TractorCard";
import { useI18n } from "./I18n";

const ranges = [
  { label: "Все мощности", min: 0, max: 999 },
  { label: "50–80 л.с.", min: 50, max: 80 },
  { label: "90–120 л.с.", min: 90, max: 120 },
  { label: "140–180 л.с.", min: 140, max: 180 },
  { label: "200–240 л.с.", min: 200, max: 240 },
];

export function CatalogExplorer({ tractors, initialPower }: { tractors: Tractor[]; initialPower?: number }) {
  const { t } = useI18n();
  const [query, setQuery] = useState("");
  const [range, setRange] = useState(() => {
    if (!initialPower) return 0;
    const found = ranges.findIndex((item, index) => index > 0 && initialPower >= item.min && initialPower <= item.max);
    return found > 0 ? found : 0;
  });
  const [stockOnly, setStockOnly] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const deferredQuery = useDeferredValue(query);
  const selected = ranges[range];
  const filtered = useMemo(() => tractors.filter((tractor) => {
    const matchesQuery = tractor.model.toLowerCase().includes(deferredQuery.toLowerCase());
    return matchesQuery && tractor.hp >= selected.min && tractor.hp <= selected.max && (!stockOnly || tractor.inStock);
  }), [tractors, deferredQuery, selected, stockOnly]);

  const renderFilters = (scope: "desktop" | "mobile") => <>
    <div className="filter-title"><strong>{t("catalog.filters")}</strong><button type="button" onClick={() => setFiltersOpen(false)} aria-label={t("catalog.closeFilters")}><X size={20} /></button></div>
    <fieldset><legend>{t("catalog.power")}</legend>{ranges.map((item, index) => <label className="radio-row" key={item.label}><input type="radio" name={`power-${scope}`} checked={range === index} onChange={() => setRange(index)} /><span>{index === 0 ? t("catalog.allPower") : item.label}</span></label>)}</fieldset>
    <fieldset><legend>{t("catalog.availability")}</legend><label className="switch-row"><input type="checkbox" checked={stockOnly} onChange={(event) => setStockOnly(event.target.checked)} /><span>{t("catalog.stockOnly")}</span></label></fieldset>
    <button className="reset-filter" type="button" onClick={() => { setRange(0); setStockOnly(false); setQuery(""); }}>{t("catalog.reset")}</button>
  </>;

  return (
    <div className="catalog-explorer">
      <aside className="catalog-filters">{renderFilters("desktop")}</aside>
      <div className={`filters-sheet ${filtersOpen ? "is-open" : ""}`}><button type="button" className="filters-backdrop" onClick={() => setFiltersOpen(false)} aria-label={t("catalog.closeFilters")} /><div className="filters-panel">{renderFilters("mobile")}</div></div>
      <section className="catalog-results">
        <div className="catalog-toolbar">
          <label className="search-box"><Search size={19} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t("catalog.search")} aria-label={t("catalog.search")} /></label>
          <button className="mobile-filter-btn" type="button" onClick={() => setFiltersOpen(true)}><SlidersHorizontal size={18} /> {t("catalog.filters")}</button>
          <span>{t("catalog.models", { count: filtered.length })}</span>
        </div>
        {filtered.length ? <div className="catalog-grid">{filtered.map((tractor) => <TractorCard tractor={tractor} key={tractor.slug} />)}</div> : <div className="empty-state"><Search size={28} /><h3>{t("catalog.notFound")}</h3><p>{t("catalog.notFoundText")}</p></div>}
      </section>
    </div>
  );
}
