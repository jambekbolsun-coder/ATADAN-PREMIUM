"use client";
import { useState, useTransition } from "react";
import { LoaderCircle } from "lucide-react";
import { savePostAction } from "../../../_lib/marketing-actions";
import { Field, Toast } from "../../../_ui/forms";
import { ImageInput, ImageList } from "../../../_ui/upload";

type L = { ru: string; ky: string; en: string };
export type PostFormValue = {
  slug: string; category: string; status: string; featured: boolean; coverImage: string; gallery: string[];
  publishedAt: string; author: string; relatedTractorSlug: string; sourceUrl: string; tags: string;
  title: L; excerpt: L; content: L;
};
const LANGS: { key: keyof L; label: string }[] = [{ key: "ru", label: "Русский" }, { key: "ky", label: "Кыргызча" }, { key: "en", label: "English" }];
const slugify = (v: string) => {
  const map: Record<string, string> = { а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "e", ж: "zh", з: "z", и: "i", й: "y", к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f", х: "h", ц: "c", ч: "ch", ш: "sh", щ: "sch", ы: "y", э: "e", ю: "yu", я: "ya", ң: "n", ө: "o", ү: "u" };
  return v.toLowerCase().split("").map((c) => map[c] ?? c).join("").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);
};

export function PostForm({ initial, originalSlug, categories, models, published }: { initial: PostFormValue; originalSlug?: string; categories: Record<string, string>; models: { slug: string; model: string }[]; published?: boolean }) {
  const [v, setV] = useState(initial);
  const [lang, setLang] = useState<keyof L>("ru");
  const [slugTouched, setSlugTouched] = useState(!!originalSlug);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [pending, start] = useTransition();
  const set = <K extends keyof PostFormValue>(k: K, val: PostFormValue[K]) => setV((x) => ({ ...x, [k]: val }));
  const setL = (k: "title" | "excerpt" | "content", val: string) => setV((x) => ({ ...x, [k]: { ...x[k], [lang]: val } }));
  const chars = v.content.ru.length;

  function submit(status: string) {
    setError("");
    start(async () => {
      const r = await savePostAction({ ...v, status, originalSlug });
      if (r && !r.ok) setError(r.error ?? "Не удалось сохранить");
      else if (r?.ok) { set("status", status); setToast(r.message ?? "Сохранено"); }
    });
  }

  return (
    <div className="ax-grid" style={{ gap: 14 }}>
      <section className="ax-card">
        <div className="ax-langs" role="group" aria-label="Язык">
          {LANGS.map((l) => <button key={l.key} type="button" aria-pressed={lang === l.key} onClick={() => setLang(l.key)}>{l.label}{l.key !== "ru" && !v.title[l.key] ? " ·" : ""}</button>)}
        </div>
        {lang !== "ru" ? <p className="ax-small" style={{ marginTop: 0 }}>Перевод необязателен: если пусто, сайт покажет русский текст.</p> : null}
        <Field label="Заголовок" htmlFor="p-title"><input id="p-title" className="ax-input" value={v.title[lang]} onChange={(e) => { setL("title", e.target.value); if (lang === "ru" && !slugTouched) set("slug", slugify(e.target.value)); }} /></Field>
        <Field label="Анонс" htmlFor="p-ex" hint="Пара предложений для карточки и поисковиков"><textarea id="p-ex" className="ax-input" rows={2} value={v.excerpt[lang]} onChange={(e) => setL("excerpt", e.target.value)} /></Field>
        <Field label="Текст статьи" htmlFor="p-body" hint={<>Абзацы через пустую строку. Подзаголовок: строка, начинающаяся с «## ». {lang === "ru" ? `${chars} знаков` : ""}</>}>
          <textarea id="p-body" className="ax-input" rows={16} value={v.content[lang]} onChange={(e) => setL("content", e.target.value)} style={{ fontFamily: "inherit", lineHeight: 1.55 }} />
        </Field>
      </section>
      <section className="ax-card">
        <h3 className="ax-card-h">Обложка и фото</h3>
        <Field label="Обложка" htmlFor="p-cover"><ImageInput value={v.coverImage} onChange={(x) => set("coverImage", x)} label="Загрузить обложку" /></Field>
        <Field label="Фото в статье" htmlFor="p-gal"><ImageList value={v.gallery} onChange={(x) => set("gallery", x)} /></Field>
      </section>
      <section className="ax-card">
        <h3 className="ax-card-h">Параметры</h3>
        <div className="ax-grid ax-g2" style={{ gap: 12 }}>
          <Field label="Рубрика" htmlFor="p-cat"><select id="p-cat" className="ax-input" value={v.category} onChange={(e) => set("category", e.target.value)}>{Object.entries(categories).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></Field>
          <Field label="Дата публикации" htmlFor="p-date"><input id="p-date" type="date" className="ax-input" value={v.publishedAt} onChange={(e) => set("publishedAt", e.target.value)} /></Field>
          <Field label="Адрес статьи" htmlFor="p-slug" hint={published ? "У опубликованной статьи не меняется" : "atadan.kg/news/…"}><input id="p-slug" className="ax-input num" value={v.slug} disabled={published} onChange={(e) => { setSlugTouched(true); set("slug", e.target.value.toLowerCase()); }} /></Field>
          <Field label="Автор" htmlFor="p-author"><input id="p-author" className="ax-input" value={v.author} onChange={(e) => set("author", e.target.value)} /></Field>
          <Field label="Связанная модель" htmlFor="p-model" hint="Кнопка «Смотреть модель» в статье"><select id="p-model" className="ax-input" value={v.relatedTractorSlug} onChange={(e) => set("relatedTractorSlug", e.target.value)}><option value="">нет</option>{models.map((m) => <option key={m.slug} value={m.slug}>{m.model}</option>)}</select></Field>
          <Field label="Теги" htmlFor="p-tags" hint="Через запятую"><input id="p-tags" className="ax-input" value={v.tags} onChange={(e) => set("tags", e.target.value)} /></Field>
        </div>
        <Field label="Источник (ссылка https://)" htmlFor="p-src"><input id="p-src" className="ax-input" value={v.sourceUrl} onChange={(e) => set("sourceUrl", e.target.value)} /></Field>
        <label className="ax-check" style={{ borderBottom: 0 }}><input type="checkbox" checked={v.featured} onChange={(e) => set("featured", e.target.checked)} /> Главная статья журнала (только одна, прежняя снимется)</label>
      </section>
      {error ? <div className="ax-error" role="alert">{error}</div> : null}
      <div className="ax-sticky-actions" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {v.status === "published" ? (
          <button type="button" className="ax-btn ax-btn-primary" disabled={pending} onClick={() => submit("published")}>{pending ? <LoaderCircle size={17} className="ax-spin" aria-hidden /> : null}Сохранить изменения</button>
        ) : (
          <>
            <button type="button" className="ax-btn ax-btn-primary" disabled={pending} onClick={() => submit("published")}>{pending ? <LoaderCircle size={17} className="ax-spin" aria-hidden /> : null}Опубликовать</button>
            <button type="button" className="ax-btn" disabled={pending} onClick={() => submit("draft")}>Сохранить черновик</button>
          </>
        )}
      </div>
      {toast ? <Toast text={toast} onDone={() => setToast("")} /> : null}
    </div>
  );
}
