"use client";

import Image from "next/image";
import { CalendarDays, CheckCircle2, ChevronRight, Clock3, Eye, FileText, Languages, Pencil, Plus, Search, Star, Trash2, X } from "lucide-react";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import type { Locale, NewsCategory, NewsPost, Tractor } from "../types";
import { Link } from "./SiteLink";

const categories: Array<[NewsCategory, string]> = [["selection", "Выбор трактора"], ["technology", "Комфорт и технологии"], ["field", "Техника в поле"], ["service", "Сервис и запчасти"], ["company", "Новости ATADAN"]];
const locales: Array<[Locale, string]> = [["ru", "Русский"], ["ky", "Кыргызча"], ["en", "English"]];

type EditorState = { post: NewsPost; originalSlug: string | null };

function emptyPost(): NewsPost {
  return {
    slug: "", category: "company", status: "draft", featured: false,
    coverImage: "/images/news/journal-hero-4k.webp", gallery: [],
    publishedAt: new Date().toISOString().slice(0, 10), readingMinutes: 5,
    author: "Команда ATADAN", relatedTractorSlug: null, sourceUrl: null, tags: [],
    title: { ru: "", ky: "", en: "" }, excerpt: { ru: "", ky: "", en: "" }, content: { ru: "", ky: "", en: "" },
  };
}

function slugify(value: string) {
  const map: Record<string, string> = { а:"a",б:"b",в:"v",г:"g",д:"d",е:"e",ё:"e",ж:"zh",з:"z",и:"i",й:"y",к:"k",л:"l",м:"m",н:"n",о:"o",п:"p",р:"r",с:"s",т:"t",у:"u",ф:"f",х:"h",ц:"c",ч:"ch",ш:"sh",щ:"sch",ъ:"",ы:"y",ь:"",э:"e",ю:"yu",я:"ya" };
  return value.toLowerCase().split("").map((char) => map[char] ?? char).join("").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 90);
}

export function AdminNewsManager({ posts, catalog, popularPosts, save, remove }: { posts: NewsPost[]; catalog: Tractor[]; popularPosts: Array<{ path: string; views: number }>; save: (post: NewsPost, originalSlug: string | null) => Promise<void>; remove: (slug: string) => Promise<void> }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [editor, setEditor] = useState<EditorState | null>(null);
  const visible = useMemo(() => posts.filter((post) => (status === "all" || post.status === status) && `${post.title.ru} ${post.tags.join(" ")}`.toLowerCase().includes(query.toLowerCase())), [posts, query, status]);
  const published = posts.filter((post) => post.status === "published").length;
  const views = new Map(popularPosts.map((item) => [item.path.replace(/^\/news\//, ""), Number(item.views)]));

  return <div className="admin-content admin-news-workspace">
    <div className="admin-news-stats"><article><FileText /><span><strong>{posts.length}</strong>всего материалов</span></article><article><CheckCircle2 /><span><strong>{published}</strong>опубликовано</span></article><article><Clock3 /><span><strong>{posts.length - published}</strong>черновиков и архивных</span></article></div>
    <div className="admin-panel admin-news-panel">
      <div className="admin-news-toolbar"><label><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Найти публикацию" aria-label="Найти публикацию" /></label><div>{[["all", "Все"], ["published", "Опубликовано"], ["draft", "Черновики"], ["archived", "Архив"]].map(([id, label]) => <button type="button" className={status === id ? "active" : ""} onClick={() => setStatus(id)} key={id}>{label}</button>)}</div><button type="button" className="admin-news-add" onClick={() => setEditor({ post: emptyPost(), originalSlug: null })}><Plus size={17} />Добавить публикацию</button></div>
      <div className="admin-news-list">{visible.map((post) => <article key={post.slug}>
        <div className="admin-news-cover"><Image src={post.coverImage} alt="" fill sizes="180px" />{post.featured ? <span><Star size={12} />Главная</span> : null}</div>
        <div className="admin-news-copy"><div><span>{categories.find(([id]) => id === post.category)?.[1]}</span><i className={post.status}>{post.status === "published" ? "Опубликовано" : post.status === "draft" ? "Черновик" : "Архив"}</i></div><h3>{post.title.ru || "Без названия"}</h3><p>{post.excerpt.ru || "Добавьте краткое описание публикации."}</p><small><CalendarDays size={13} />{new Date(`${post.publishedAt}T12:00:00`).toLocaleDateString("ru-RU")} · {post.readingMinutes} мин. · {views.get(post.slug) ?? 0} просмотров</small></div>
        <div className="admin-news-actions">{post.status === "published" ? <Link href={`/news/${post.slug}`} target="_blank" aria-label={`Открыть ${post.title.ru}`}><Eye size={17} /></Link> : null}<button type="button" onClick={() => setEditor({ post: structuredClone(post), originalSlug: post.slug })} aria-label={`Изменить ${post.title.ru}`}><Pencil size={16} /></button><button type="button" className="danger" onClick={() => confirm(`Удалить «${post.title.ru}»?`) && void remove(post.slug)} aria-label={`Удалить ${post.title.ru}`}><Trash2 size={16} /></button><ChevronRight size={17} /></div>
      </article>)}</div>
    </div>
    {editor ? <NewsEditor state={editor} catalog={catalog} close={() => setEditor(null)} save={async (post) => { await save(post, editor.originalSlug); setEditor(null); }} /> : null}
  </div>;
}

function NewsEditor({ state, catalog, close, save }: { state: EditorState; catalog: Tractor[]; close: () => void; save: (post: NewsPost) => Promise<void> }) {
  const [post, setPost] = useState(state.post);
  const [locale, setLocale] = useState<Locale>("ru");
  const [saving, setSaving] = useState(false);
  const dialog = useRef<HTMLFormElement>(null);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") close(); };
    window.addEventListener("keydown", onKey);
    dialog.current?.querySelector<HTMLElement>("input,button,textarea,select")?.focus();
    return () => window.removeEventListener("keydown", onKey);
  }, [close]);

  function setLocalized(field: "title" | "excerpt" | "content", value: string) {
    setPost((current) => ({ ...current, [field]: { ...current[field], [locale]: value }, ...(field === "title" && locale === "ru" && !state.originalSlug ? { slug: slugify(value) } : {}) }));
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!post.slug || !post.title.ru || !post.coverImage) return;
    setSaving(true);
    await save(post);
    setSaving(false);
  }

  return <div className="news-editor-overlay"><button type="button" className="news-editor-backdrop" onClick={close} aria-label="Закрыть редактор" /><form ref={dialog} className="news-editor" onSubmit={submit} role="dialog" aria-modal="true" aria-labelledby="news-editor-title">
    <header><div><span>{state.originalSlug ? "Редактирование" : "Новый материал"}</span><h2 id="news-editor-title">{post.title.ru || "Публикация без названия"}</h2></div><button type="button" onClick={close} aria-label="Закрыть"><X /></button></header>
    <div className="news-editor-body">
      <fieldset><legend>Публикация</legend><div className="news-editor-grid"><label><span>Статус</span><select value={post.status} onChange={(event) => setPost({ ...post, status: event.target.value as NewsPost["status"] })}><option value="draft">Черновик</option><option value="published">Опубликовано</option><option value="archived">Архив</option></select></label><label><span>Категория</span><select value={post.category} onChange={(event) => setPost({ ...post, category: event.target.value as NewsCategory })}>{categories.map(([id, label]) => <option value={id} key={id}>{label}</option>)}</select></label><label><span>Дата</span><input type="date" value={post.publishedAt} onChange={(event) => setPost({ ...post, publishedAt: event.target.value })} required /></label><label><span>Время чтения</span><input type="number" min="1" max="60" value={post.readingMinutes} onChange={(event) => setPost({ ...post, readingMinutes: Number(event.target.value) })} /></label><label className="full"><span>Slug страницы</span><input value={post.slug} onChange={(event) => setPost({ ...post, slug: slugify(event.target.value) })} required /></label><label className="news-feature-check"><input type="checkbox" checked={post.featured} onChange={(event) => setPost({ ...post, featured: event.target.checked })} /><Star size={16} /><span>Показывать как главную публикацию</span></label></div></fieldset>
      <fieldset><legend>Текст</legend><div className="news-locale-tabs" role="tablist" aria-label="Язык публикации">{locales.map(([id, label]) => <button type="button" role="tab" aria-selected={locale === id} className={locale === id ? "active" : ""} onClick={() => setLocale(id)} key={id}><Languages size={14} />{label}</button>)}</div><div className="news-copy-fields"><label><span>Заголовок</span><input value={post.title[locale]} onChange={(event) => setLocalized("title", event.target.value)} required={locale === "ru"} /></label><label><span>Краткое описание</span><textarea rows={3} value={post.excerpt[locale]} onChange={(event) => setLocalized("excerpt", event.target.value)} required={locale === "ru"} /></label><label><span>Полный текст</span><textarea rows={14} value={post.content[locale]} onChange={(event) => setLocalized("content", event.target.value)} placeholder={'## Подзаголовок\nТекст абзаца'} required={locale === "ru"} /></label><small>Для подзаголовка начните строку с «## ». Разделяйте абзацы пустой строкой.</small></div></fieldset>
      <fieldset><legend>Медиа и связи</legend><div className="news-editor-grid"><label className="full"><span>Обложка</span><input value={post.coverImage} onChange={(event) => setPost({ ...post, coverImage: event.target.value })} required /></label><label className="full"><span>Галерея — ссылки через запятую</span><textarea rows={3} value={(post.gallery ?? []).join(", ")} onChange={(event) => setPost({ ...post, gallery: event.target.value.split(",").map((item) => item.trim()).filter(Boolean) })} /></label><label><span>Автор</span><input value={post.author} onChange={(event) => setPost({ ...post, author: event.target.value })} /></label><label><span>Связанный трактор</span><select value={post.relatedTractorSlug ?? ""} onChange={(event) => setPost({ ...post, relatedTractorSlug: event.target.value || null })}><option value="">Без модели</option>{catalog.map((tractor) => <option value={tractor.slug} key={tractor.slug}>{tractor.model} · {tractor.hp} л.с.</option>)}</select></label><label className="full"><span>Теги — через запятую</span><input value={post.tags.join(", ")} onChange={(event) => setPost({ ...post, tags: event.target.value.split(",").map((item) => item.trim()).filter(Boolean) })} /></label><label className="full"><span>Ссылка на официальный источник</span><input type="url" value={post.sourceUrl ?? ""} onChange={(event) => setPost({ ...post, sourceUrl: event.target.value || null })} /></label></div></fieldset>
    </div>
    <footer><button type="button" onClick={close}>Отмена</button><button type="submit" className="admin-primary" disabled={saving}>{saving ? "Сохраняем…" : post.status === "published" ? "Опубликовать" : "Сохранить черновик"}</button></footer>
  </form></div>;
}
