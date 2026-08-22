"use client";

import Image from "next/image";
import { Link } from "./SiteLink";
import { ChevronRight } from "lucide-react";
import { useI18n } from "./I18n";

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
  return (
    <section className="page-hero page-hero-image">
      <Image src={image} alt="" fill priority sizes="100vw" />
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
