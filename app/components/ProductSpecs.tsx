"use client";

import { ArrowUpFromLine, ArrowUpRight, Cog, FileDown, Gauge, ListTree, Ruler, Scale, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { Tractor } from "../types";
import { useI18n } from "./I18n";
import { Link } from "./SiteLink";
import { localizeSpecs } from "../lib/tractor-localization";
import { SPEC_GROUPS, tractorGearbox, tractorKw, tractorMassKg, tractorMaxSpeed, tractorTractionKn } from "../lib/tractor-facts";

const ICONS = { engine: Gauge, drive: Cog, size: Ruler, hitch: ArrowUpFromLine, other: ListTree } as const;
const COMPACT_ROWS = 3;
const LONG_VALUE = 70;

/** Длинное значение в окне: две строки и кнопка «Показать полностью». */
function LongValue({ value }: { value: string }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  return (
    <span className={`spec-long${open ? " is-open" : ""}`}>
      <span>{value}</span>
      <button type="button" aria-expanded={open} onClick={() => setOpen(!open)}>{t(open ? "ui.specs.less" : "ui.specs.full")}</button>
    </span>
  );
}

/** Характеристики «на одном экране»: главные цифры, 4 группы по 3 строки, полный список в окне «Подробнее». */
export function ProductSpecs({ tractor }: { tractor: Tractor }) {
  const { t, locale } = useI18n();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const numberLocale = locale === "en" ? "en-US" : "ru-RU";
  const fmt = (value: number, digits = 1) => new Intl.NumberFormat(numberLocale, { maximumFractionDigits: digits }).format(value);
  const specs = tractor.specs ?? {};
  const localizedRow = (key: string) => localizeSpecs({ [key]: specs[key] }, locale)[0];
  const known = new Set(SPEC_GROUPS.flatMap((group) => group.keys));
  const groups = [
    ...SPEC_GROUPS.map((group) => ({ id: group.id as keyof typeof ICONS, rows: group.keys.filter((key) => specs[key]?.trim()).map(localizedRow) })),
    { id: "other" as const, rows: Object.keys(specs).filter((key) => !known.has(key) && specs[key]?.trim()).map(localizedRow) },
  ].filter((group) => group.rows.length);
  const total = groups.reduce((sum, group) => sum + group.rows.length, 0);
  const compactGroups = groups.filter((group) => group.id !== "other").slice(0, 4);

  const kw = tractorKw(tractor), mass = tractorMassKg(tractor), traction = tractorTractionKn(tractor), speed = tractorMaxSpeed(tractor), gearbox = tractorGearbox(tractor);
  const keyNumbers = [
    { label: t("ui.card.power"), value: `${tractor.hp} ${t("common.hp")}`, note: kw ? `${fmt(kw)} ${t("ui.cat.kw")}` : "" },
    mass ? { label: t("ui.card.mass"), value: `${fmt(mass, 0)} ${t("ui.card.kg")}`, note: t("ui.specs.massNote") } : null,
    traction ? { label: t("ui.card.traction"), value: `${fmt(traction)} ${t("ui.card.kn")}`, note: t("ui.specs.tractionNote") } : null,
    speed ? { label: t("ui.cat.cmp.speed"), value: t("ui.cat.speedUpTo", { n: speed }), note: t("ui.specs.speedNote") } : null,
    gearbox ? { label: t("ui.card.gearbox"), value: gearbox, note: t("ui.specs.gearNote") } : null,
  ].filter((item): item is { label: string; value: string; note: string } => Boolean(item));

  // Печать / PDF: показываем только полный список характеристик.
  useEffect(() => {
    const done = () => document.documentElement.classList.remove("printing-specs");
    window.addEventListener("afterprint", done);
    return () => window.removeEventListener("afterprint", done);
  }, []);
  function printSpecs() {
    document.documentElement.classList.add("printing-specs");
    window.print();
  }

  const groupBlock = (group: (typeof groups)[number], rows: number | null, scope: string) => {
    const Icon = ICONS[group.id];
    const list = rows === null ? group.rows : group.rows.slice(0, rows);
    return (
      <section className="spec-group" key={`${scope}-${group.id}`} aria-labelledby={`${scope}-${group.id}`}>
        <h3 id={`${scope}-${group.id}`}><Icon size={18} aria-hidden />{t(`ui.specs.group.${group.id}`)}</h3>
        <dl>
          {list.map(([label, value]) => <div key={label}><dt>{label}</dt><dd title={rows === null ? undefined : value}>{rows === null && value.length > LONG_VALUE ? <LongValue value={value} /> : value}</dd></div>)}
        </dl>
      </section>
    );
  };

  return (
    <section className="product-specs-v4 section-shell" id="specs">
      <div className="specs-v4-card">
        <div className="specs-v4-head">
          <div>
            <span className="section-label">{t("product.specLabel")}</span>
            <h2>{t("ui.specs.title", { model: tractor.model })}</h2>
          </div>
          <p>{t("product.specNote")}</p>
        </div>
        {keyNumbers.length ? (
          <ul className="specs-v4-keys">
            {keyNumbers.map((item) => <li key={item.label}><span>{item.label}</span><strong>{item.value}</strong>{item.note ? <small>{item.note}</small> : null}</li>)}
          </ul>
        ) : null}
        <div className="specs-v4-groups">{compactGroups.map((group) => groupBlock(group, COMPACT_ROWS, "c"))}</div>
        <div className="specs-v4-actions">
          <button type="button" className="primary-btn" onClick={() => dialogRef.current?.showModal()}>{t("ui.specs.more", { n: total })}<ArrowUpRight size={18} aria-hidden /></button>
          <button type="button" className="ghost-btn" onClick={printSpecs}><FileDown size={18} aria-hidden />{t("ui.specs.pdf")}</button>
          <Link className="ghost-btn" href={`/catalog?compare=${encodeURIComponent(tractor.slug)}`}><Scale size={18} aria-hidden />{t("ui.specs.compare")}</Link>
          {tractor.sourceUrl ? <a className="source-link-v3" href={tractor.sourceUrl} target="_blank" rel="noreferrer">{t("product.source")}<ArrowUpRight size={17} /></a> : null}
        </div>
      </div>

      <dialog ref={dialogRef} className="site-dialog specs-dialog" data-lenis-prevent aria-labelledby="specs-dialog-title">
        <div className="site-dialog-inner">
          <header>
            <div>
              <small>{t("ui.specs.all", { n: total })}</small>
              <h2 id="specs-dialog-title">Changfa {tractor.model}</h2>
            </div>
            <button type="button" className="dialog-close" onClick={() => dialogRef.current?.close()} aria-label={t("ui.common.close")}><X size={20} /></button>
          </header>
          <div className="specs-v4-groups is-full site-dialog-body">{groups.map((group) => groupBlock(group, null, "d"))}</div>
          <footer>
            <button type="button" className="ghost-btn" onClick={printSpecs}><FileDown size={18} aria-hidden />{t("ui.specs.pdf")}</button>
            <span className="wizard-note">{t("product.specNote")}</span>
          </footer>
        </div>
      </dialog>

      <div className="specs-print" aria-hidden>
        <h1>Changfa {tractor.model} · {tractor.hp} {t("common.hp")}</h1>
        <p>ATADAN · atadan.kg</p>
        {groups.map((group) => (
          <table key={group.id}>
            <caption>{t(`ui.specs.group.${group.id}`)}</caption>
            <tbody>{group.rows.map(([label, value]) => <tr key={label}><th>{label}</th><td>{value}</td></tr>)}</tbody>
          </table>
        ))}
        <p>{t("product.specNote")}</p>
      </div>
    </section>
  );
}
