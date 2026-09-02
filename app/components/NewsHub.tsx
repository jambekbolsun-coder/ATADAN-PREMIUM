"use client";

import Image from "next/image";
import { ArrowUpRight, Clock3, Search, Sparkles, Tractor } from "lucide-react";
import { useMemo, useState } from "react";
import { newsCategoryLabels } from "../data/news";
import type { NewsCategory, NewsPost } from "../types";
import { Link } from "./SiteLink";
import { useI18n } from "./I18n";

const ui = {
  ru: { brand: "ATADAN АгроЖурнал", title: "Знания, которые работают в поле", subtitle: "Понятно рассказываем о выборе техники, работе, комфорте и обслуживании Changfa.", cta: "Читать свежие материалы", library: "Библиотека ATADAN", latest: "Новые материалы", search: "Найти тему", all: "Все материалы", read: "минут чтения", open: "Открыть материал", empty: "Материалы не найдены", emptyText: "Попробуйте изменить запрос или выбрать другую категорию." },
  ky: { brand: "ATADAN АгроЖурнал", title: "Талаада иштеген билим", subtitle: "Changfa техникасын тандоо, иштетүү, комфорт жана сервис тууралуу жөнөкөй айтып беребиз.", cta: "Жаңы материалдарды окуу", library: "ATADAN китепканасы", latest: "Жаңы материалдар", search: "Теманы издөө", all: "Бардык материалдар", read: "мүнөт окуу", open: "Материалды ачуу", empty: "Материал табылган жок", emptyText: "Издөөнү же категорияны өзгөртүп көрүңүз." },
  en: { brand: "ATADAN AgroJournal", title: "Knowledge that works in the field", subtitle: "Clear guidance on choosing, operating, servicing and working comfortably with Changfa machinery.", cta: "Read the latest stories", library: "ATADAN library", latest: "Latest stories", search: "Search a topic", all: "All stories", read: "min read", open: "Open story", empty: "No stories found", emptyText: "Try another search or choose a different category." },
} as const;

function localized(post: NewsPost, locale: "ru" | "ky" | "en") {
  return { title: post.title[locale] || post.title.ru, excerpt: post.excerpt[locale] || post.excerpt.ru };
}

export function NewsHub({ posts }: { posts: NewsPost[] }) {
  const { locale } = useI18n();
  const labels = ui[locale];
  const [category, setCategory] = useState<"all" | NewsCategory>("all");
  const [query, setQuery] = useState("");
  const featured = posts.find((post) => post.featured) ?? posts[0];
  const categories: Array<["all" | NewsCategory, string]> = [["all", labels.all], ...Object.entries(newsCategoryLabels[locale]) as Array<[NewsCategory, string]>];
  const filtered = useMemo(() => posts.filter((post) => {
    const copy = localized(post, locale);
    const needle = query.trim().toLowerCase();
    return (category === "all" || post.category === category) && (!needle || `${copy.title} ${copy.excerpt} ${post.tags.join(" ")}`.toLowerCase().includes(needle));
  }), [category, locale, posts, query]);

  if (!featured) return null;
  const featuredCopy = localized(featured, locale);

  return <main className="news-hub">
    <section className="news-hero">
      <Image src="/images/news/journal-hero-4k.webp" alt="Трактор Changfa в поле Кыргызстана" fill priority sizes="100vw" />
      <div className="news-hero-shade" />
      <div className="section-shell news-hero-content">
        <span><Sparkles size={15} /> {labels.brand}</span>
        <h1>{labels.title}</h1>
        <p>{labels.subtitle}</p>
        <a href="#latest" className="news-hero-cta">{labels.cta}<ArrowUpRight size={18} /></a>
      </div>
    </section>

    <section className="news-feature section-shell" aria-label={featuredCopy.title}>
      <Link href={`/news/${featured.slug}`} className="news-feature-card">
        <div className="news-feature-media"><Image src={featured.coverImage} alt={featuredCopy.title} fill sizes="(max-width: 900px) 100vw, 56vw" /></div>
        <div className="news-feature-copy"><span>{newsCategoryLabels[locale][featured.category]}</span><h2>{featuredCopy.title}</h2><p>{featuredCopy.excerpt}</p><div><small><Clock3 size={14} /> {featured.readingMinutes} {labels.read}</small><b>{labels.open}<ArrowUpRight size={17} /></b></div></div>
      </Link>
    </section>

    <section className="news-library section-shell" id="latest">
      <div className="news-library-head"><div><span>{labels.library}</span><h2>{labels.latest}</h2></div><label className="news-search"><Search size={17} aria-hidden="true" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={labels.search} aria-label={labels.search} /></label></div>
      <div className="news-category-tabs" role="list" aria-label={labels.latest}>{categories.map(([id, label]) => <button type="button" className={category === id ? "active" : ""} aria-pressed={category === id} onClick={() => setCategory(id)} key={id}>{label}</button>)}</div>
      {filtered.length ? <div className="news-grid">{filtered.map((post) => {
        const copy = localized(post, locale);
        return <Link href={`/news/${post.slug}`} className="news-card" key={post.slug}><div className="news-card-media"><Image src={post.coverImage} alt={copy.title} fill sizes="(max-width: 760px) 100vw, 33vw" /></div><div className="news-card-body"><span>{newsCategoryLabels[locale][post.category]}</span><h3>{copy.title}</h3><p>{copy.excerpt}</p><div><small><Clock3 size={13} /> {post.readingMinutes} {labels.read}</small><ArrowUpRight size={18} aria-hidden="true" /></div></div></Link>;
      })}</div> : <div className="news-empty"><Tractor size={42} /><h3>{labels.empty}</h3><p>{labels.emptyText}</p></div>}
    </section>
  </main>;
}
