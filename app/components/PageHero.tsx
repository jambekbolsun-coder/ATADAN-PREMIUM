"use client";

import { Link } from "./SiteLink";
import { ChevronRight } from "lucide-react";
import { useI18n } from "./I18n";
import { ResponsiveHeroMedia } from "./ResponsiveHeroMedia";

type PageHeroProps = {
  image: string;
  kickerId: string;
  titleId: string;
  subtitleId: string;
  values?: Record<string, string | number>;
  pageLabelId?: string;
};

export function PageHero({ image, kickerId, titleId, subtitleId, values, pageLabelId }: PageHeroProps) {
  const { t } = useI18n();
  const mediaName=image.split("/").pop()?.replace(/\.[a-z0-9]+$/i,"").replace(/[^a-z0-9-]/gi,"-").toLowerCase()||"default";
  return (
    <section className={`page-hero page-hero-image page-hero-${mediaName}`}>
      <ResponsiveHeroMedia image={image} priority />
      <div className="page-hero-overlay" />
      <div className="page-hero-content">
        <nav className="page-breadcrumb" aria-label="Хлебные крошки">
          <Link href="/">ATADAN</Link><ChevronRight size={14} />
          <span>{t(pageLabelId ?? titleId)}</span>
        </nav>
        <span className="eyebrow">{t(kickerId)}</span>
        <h1>{t(titleId, values)}</h1>
        <p>{t(subtitleId, values)}</p>
      </div>
    </section>
  );
}
