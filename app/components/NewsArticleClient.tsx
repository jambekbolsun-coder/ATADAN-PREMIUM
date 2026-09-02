"use client";

import Image from "next/image";
import { ArrowLeft, ArrowUpRight, CalendarDays, Check, Clock3, ExternalLink, MessageCircle, Share2, UserRound } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { newsCategoryLabels } from "../data/news";
import type { NewsPost, Tractor } from "../types";
import { Link } from "./SiteLink";
import { useI18n } from "./I18n";

const articleUi = {
  ru: { back: "Все материалы", read: "минут чтения", updated: "Опубликовано", contents: "В этой статье", expert: "Нужен совет по вашему хозяйству?", expertText: "Расскажите о площади, работах и навесном оборудовании. Менеджер ATADAN сравнит подходящие модели без давления.", ask: "Задать вопрос", relatedModel: "Модель по теме", catalog: "Смотреть трактор", source: "Источник производителя", share: "Поделиться", copied: "Ссылка скопирована", more: "Читайте дальше" },
  ky: { back: "Бардык материалдар", read: "мүнөт окуу", updated: "Жарыяланган", contents: "Бул макалада", expert: "Чарбаңыз боюнча кеңеш керекпи?", expertText: "Аянт, жумуш жана жабдуу жөнүндө айтыңыз. ATADAN адиси ылайыктуу моделдерди салыштырат.", ask: "Суроо берүү", relatedModel: "Темага ылайык модель", catalog: "Тракторду көрүү", source: "Өндүрүүчүнүн булагы", share: "Бөлүшүү", copied: "Шилтеме көчүрүлдү", more: "Дагы окуңуз" },
  en: { back: "All stories", read: "min read", updated: "Published", contents: "In this story", expert: "Need advice for your farm?", expertText: "Tell us about your area, jobs and implements. An ATADAN manager will compare suitable models without pressure.", ask: "Ask a question", relatedModel: "Related model", catalog: "View tractor", source: "Manufacturer source", share: "Share", copied: "Link copied", more: "Read next" },
} as const;

function parseArticle(value: string) {
  const chunks = value.split(/\n\n+/).map((item) => item.trim()).filter(Boolean);
  const sections: Array<{ heading: string; paragraphs: string[] }> = [];
  for (const chunk of chunks) {
    if (chunk.startsWith("## ")) {
      const [heading, ...body] = chunk.split("\n");
      sections.push({ heading: heading.slice(3).trim(), paragraphs: body.join("\n").trim() ? [body.join("\n").trim()] : [] });
    }
    else {
      if (!sections.length) sections.push({ heading: "", paragraphs: [] });
      sections[sections.length - 1].paragraphs.push(chunk);
    }
  }
  return sections;
}

export function NewsArticleClient({ post, related, tractor }: { post: NewsPost; related: NewsPost[]; tractor: Tractor | null }) {
  const { locale } = useI18n();
  const labels = articleUi[locale];
  const [progress, setProgress] = useState(0);
  const [copied, setCopied] = useState(false);
  const sections = useMemo(() => parseArticle(post.content[locale] || post.content.ru), [locale, post.content]);
  const title = post.title[locale] || post.title.ru;
  const excerpt = post.excerpt[locale] || post.excerpt.ru;

  useEffect(() => {
    const update = () => {
      const article = document.querySelector(".news-article-body");
      if (!article) return;
      const rect = article.getBoundingClientRect();
      const total = rect.height - window.innerHeight;
      setProgress(Math.min(100, Math.max(0, (-rect.top + 120) / Math.max(1, total) * 100)));
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);

  async function share() {
    const payload = { title, text: excerpt, url: window.location.href };
    if (navigator.share) await navigator.share(payload).catch(() => undefined);
    else {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    }
  }

  const whatsappText = encodeURIComponent(`Здравствуйте! Прочитал материал «${post.title.ru}». Хочу подобрать трактор для своего хозяйства.`);

  return <main className="news-article">
    <div className="article-progress" aria-hidden="true"><span style={{ width: `${progress}%` }} /></div>
    <header className="news-article-header section-shell">
      <Link href="/news" className="article-back"><ArrowLeft size={17} />{labels.back}</Link>
      <div className="article-heading-grid">
        <div className="article-heading-copy">
          <span className="article-category">{newsCategoryLabels[locale][post.category]}</span>
          <h1>{title}</h1>
          <p>{excerpt}</p>
          <div className="article-meta"><span><CalendarDays size={16} />{labels.updated} {new Date(`${post.publishedAt}T12:00:00`).toLocaleDateString(locale === "ky" ? "ky-KG" : locale === "en" ? "en-GB" : "ru-RU", { day: "numeric", month: "long", year: "numeric" })}</span><span><Clock3 size={16} />{post.readingMinutes} {labels.read}</span><span><UserRound size={16} />{post.author}</span></div>
        </div>
        <button type="button" className="article-share" onClick={share}>{copied ? <Check size={17} /> : <Share2 size={17} />}{copied ? labels.copied : labels.share}</button>
      </div>
    </header>

    <div className="article-cover section-shell"><Image src={post.coverImage} alt={title} fill priority sizes="(max-width: 1420px) 100vw, 1370px" /></div>

    <div className="article-layout section-shell">
      <aside className="article-toc"><span>{labels.contents}</span><nav>{sections.filter((section) => section.heading).map((section, index) => <a href={`#section-${index}`} key={section.heading}><i>{String(index + 1).padStart(2, "0")}</i>{section.heading}</a>)}</nav></aside>
      <article className="news-article-body">
        {sections.map((section, index) => <section id={`section-${index}`} key={`${section.heading}-${index}`}>{section.heading ? <h2>{section.heading}</h2> : null}{section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}</section>)}
        {post.gallery && post.gallery.length > 1 ? <div className="article-gallery">{post.gallery.slice(1, 3).map((image, index) => <div key={image}><Image src={image} alt={`${title}, фото ${index + 2}`} fill sizes="(max-width: 720px) 100vw, 34vw" /></div>)}</div> : null}
        {post.sourceUrl ? <a className="article-source" href={post.sourceUrl} target="_blank" rel="noreferrer"><ExternalLink size={16} />{labels.source}</a> : null}
        <section className="article-expert-cta"><div><span>ATADAN · Changfa</span><h2>{labels.expert}</h2><p>{labels.expertText}</p></div><a href={`https://wa.me/996706131404?text=${whatsappText}`} target="_blank" rel="noreferrer"><MessageCircle size={19} />{labels.ask}</a></section>
      </article>
      {tractor ? <aside className="article-tractor-card"><span>{labels.relatedModel}</span><div><Image src={tractor.image} alt={`Changfa ${tractor.model}`} fill sizes="280px" /></div><h3>Changfa {tractor.model}</h3><p>{tractor.hp} л.с. · {tractor.farmArea}</p><Link href={`/catalog/${tractor.slug}`}>{labels.catalog}<ArrowUpRight size={17} /></Link></aside> : null}
    </div>

    <section className="article-related section-shell"><div className="article-related-head"><span>{labels.more}</span><Link href="/news">{labels.back}<ArrowUpRight size={16} /></Link></div><div>{related.map((item) => <Link href={`/news/${item.slug}`} className="article-related-card" key={item.slug}><div><Image src={item.coverImage} alt={item.title[locale] || item.title.ru} fill sizes="(max-width: 720px) 100vw, 33vw" /></div><span>{newsCategoryLabels[locale][item.category]}</span><h3>{item.title[locale] || item.title.ru}</h3></Link>)}</div></section>
  </main>;
}
