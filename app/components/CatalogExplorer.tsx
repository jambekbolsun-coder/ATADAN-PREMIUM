"use client";

import { Search, SlidersHorizontal, X } from "lucide-react";
import { useDeferredValue, useMemo, useState } from "react";
import type { Tractor } from "../types";
import { TractorCard } from "./TractorCard";

const ranges = [
  { label: "Все мощности", min: 0, max: 999 },
  { label: "50–80 л.с.", min: 50, max: 80 },
  { label: "90–120 л.с.", min: 90, max: 120 },
  { label: "140–180 л.с.", min: 140, max: 180 },
  { label: "200–240 л.с.", min: 200, max: 240 },
];

export function CatalogExplorer({ tractors, initialPower }: { tractors: Tractor[]; initialPower?: number }) {
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
    <div className="filter-title"><strong>Фильтры</strong><button type="button" onClick={() => setFiltersOpen(false)} aria-label="Закрыть фильтры"><X size={20} /></button></div>
    <fieldset><legend>Мощность</legend>{ranges.map((item, index) => <label className="radio-row" key={item.label}><input type="radio" name={`power-${scope}`} checked={range === index} onChange={() => setRange(index)} /><span>{item.label}</span></label>)}</fieldset>
    <fieldset><legend>Доступность</legend><label className="switch-row"><input type="checkbox" checked={stockOnly} onChange={(event) => setStockOnly(event.target.checked)} /><span>Только в наличии</span></label></fieldset>
    <button className="reset-filter" type="button" onClick={() => { setRange(0); setStockOnly(false); setQuery(""); }}>Сбросить фильтры</button>
  </>;

  return (
    <div className="catalog-explorer">
      <aside className="catalog-filters">{renderFilters("desktop")}</aside>
      <div className={`filters-sheet ${filtersOpen ? "is-open" : ""}`}><button type="button" className="filters-backdrop" onClick={() => setFiltersOpen(false)} aria-label="Закрыть фильтры" /><div className="filters-panel">{renderFilters("mobile")}</div></div>
      <section className="catalog-results">
        <div className="catalog-toolbar">
          <label className="search-box"><Search size={19} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Поиск по модели" aria-label="Поиск по модели" /></label>
          <button className="mobile-filter-btn" type="button" onClick={() => setFiltersOpen(true)}><SlidersHorizontal size={18} /> Фильтры</button>
          <span>{filtered.length} моделей</span>
        </div>
        {filtered.length ? <div className="catalog-grid">{filtered.map((tractor) => <TractorCard tractor={tractor} key={tractor.slug} />)}</div> : <div className="empty-state"><Search size={28} /><h3>Таких моделей не найдено</h3><p>Попробуйте изменить мощность или сбросить фильтры.</p></div>}
      </section>
    </div>
  );
}
