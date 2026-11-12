"use client";
import Link from "next/link";
import { useState, useTransition } from "react";
import { ClipboardPaste, LoaderCircle, Send, Sparkles, Trash2 } from "lucide-react";
import { parseLeads, phoneDigits, type ParsedLead } from "../../../_lib/lead-parse";
import { duplicatesAction, saveQuickLeadsAction } from "../../../_lib/quick-leads-actions";
import { Field } from "../../../_ui/forms";
import { Notice } from "../../../_ui/ui";

type Card = ParsedLead & { key: number; include: boolean };
type Dup = { phone: string; kind: "lead" | "client"; label: string };
let seq = 0;

const SAMPLE = `📌 Новая встреча - ATADAN
👤 Имя: Канай
📞 Телефон: +996 709 141 371
🎯 Для чего: 150–400 гектар, нужен трактор 180 л.с.
🚜 Интересует модель: CFH1804-M
💳 Оплата: рассрочка (взнос 10%)
📅 Встреча: 28-го в 15:00`;

export function QuickLeadsForm({ models, sellers, sources, me }: { models: { slug: string; model: string; label: string }[]; sellers: { id: string; name: string }[]; sources: Record<string, string>; me: string }) {
  const [text, setText] = useState("");
  const [cards, setCards] = useState<Card[]>([]);
  const [dups, setDups] = useState<Dup[]>([]);
  const [assignee, setAssignee] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(0);
  const [parsed, setParsed] = useState(false);
  const [checking, startCheck] = useTransition();
  const [saving, startSave] = useTransition();

  const parse = (value = text) => {
    setError(""); setDone(0);
    const list = parseLeads(value, models).map((l) => ({ ...l, key: ++seq, include: true }));
    setCards(list);
    setParsed(true);
    setDups([]);
    const phones = list.map((l) => l.phone).filter(Boolean);
    if (phones.length) startCheck(async () => setDups(await duplicatesAction(phones)));
  };
  const update = (key: number, patch: Partial<Card>) => setCards((x) => x.map((c) => (c.key === key ? { ...c, ...patch } : c)));
  const chosen = cards.filter((c) => c.include);
  const dupsFor = (phone: string) => { const d = phoneDigits(phone); return d ? dups.filter((x) => x.phone === d) : []; };

  const save = () => {
    setError("");
    const bad = chosen.find((c) => c.name.trim().length < 2 || !phoneDigits(c.phone));
    if (bad) return setError(`Проверьте заявку ${cards.indexOf(bad) + 1}: нужны имя и телефон`);
    startSave(async () => {
      const r = await saveQuickLeadsAction({ assignee, items: chosen.map((c) => ({ name: c.name, phone: c.phone, model: c.modelSlug, source: c.source, comment: c.comment, meetingAt: c.meetingAt, raw: c.raw })) });
      if (!r.ok) return setError(r.error ?? "Не удалось сохранить");
      setDone(r.count ?? chosen.length);
      setCards([]); setText(""); setParsed(false); setDups([]);
    });
  };

  return (
    <div className="ax-grid" style={{ gap: 14, alignContent: "start" }}>
      <div className="ax-card">
        <Field label="Текст из чат-бота, WhatsApp или Instagram" htmlFor="ql-text" hint="Можно вставить сразу несколько анкет или сообщений. Ctrl + Enter: разобрать">
          <textarea
            id="ql-text"
            className="ax-input"
            rows={9}
            value={text}
            placeholder={SAMPLE}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); parse(); } }}
            style={{ minHeight: 190, fontSize: 15, lineHeight: 1.45 }}
          />
        </Field>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button type="button" className="ax-btn ax-btn-primary" disabled={!text.trim()} onClick={() => parse()}><Sparkles size={17} aria-hidden />Разобрать</button>
          <button
            type="button"
            className="ax-btn"
            onClick={async () => { try { const v = await navigator.clipboard.readText(); if (v) { setText(v); parse(v); } } catch { setError("Браузер не дал прочитать буфер: вставьте текст вручную (Ctrl + V)"); } }}
          ><ClipboardPaste size={17} aria-hidden />Вставить из буфера</button>
          {text || cards.length ? <button type="button" className="ax-btn ax-btn-ghost" onClick={() => { setText(""); setCards([]); setParsed(false); setError(""); setDups([]); }}><Trash2 size={16} aria-hidden />Очистить</button> : null}
        </div>
      </div>

      {done ? <Notice tone="good">Добавлено заявок: {done}. <Link href={assignee ? "/admin/work/leads?view=work" : "/admin/work/leads"} style={{ color: "var(--brand)", fontWeight: 600 }}>Открыть заявки</Link></Notice> : null}
      {parsed && !cards.length ? <Notice tone="warn">Не нашёл ни имени, ни телефона. Проверьте текст: нужна хотя бы строка «Имя: …» или номер телефона.</Notice> : null}

      {cards.map((c, i) => {
        const found = dupsFor(c.phone);
        const model = models.find((m) => m.slug === c.modelSlug);
        return (
          <article key={c.key} className="ax-card" style={{ opacity: c.include ? 1 : 0.55 }}>
            <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginBottom: 10 }}>
              <label className="ax-check" style={{ margin: 0 }}><input type="checkbox" checked={c.include} onChange={(e) => update(c.key, { include: e.target.checked })} /> <b>Заявка {i + 1}</b></label>
              <span className="ax-tag ax-c-sun">{sources[c.source] ?? c.source}</span>
              {model ? <span className="ax-tag ax-c-green">{model.model}</span> : c.modelText ? <span className="ax-tag ax-c-terra">модель «{c.modelText}» не найдена в каталоге</span> : null}
              {checking ? <span className="ax-small"><LoaderCircle size={13} className="ax-spin" aria-hidden /> проверяю дубли</span> : null}
            </div>
            {found.length ? <div style={{ marginBottom: 10 }}><Notice tone="warn">Этот номер уже есть. {found.map((f) => f.label).join(". ")}. Если это тот же клиент, снимите галочку.</Notice></div> : null}
            <div className="ax-grid ax-g2" style={{ gap: 12 }}>
              <Field label="Имя" htmlFor={`ql-n-${c.key}`}><input id={`ql-n-${c.key}`} className="ax-input" value={c.name} onChange={(e) => update(c.key, { name: e.target.value })} /></Field>
              <Field label="Телефон" htmlFor={`ql-p-${c.key}`}><input id={`ql-p-${c.key}`} className="ax-input num" inputMode="tel" value={c.phone} onChange={(e) => update(c.key, { phone: e.target.value })} /></Field>
              <Field label="Модель" htmlFor={`ql-m-${c.key}`}>
                <select id={`ql-m-${c.key}`} className="ax-input" value={c.modelSlug} onChange={(e) => update(c.key, { modelSlug: e.target.value })}>
                  <option value="">Не выбрана</option>
                  {models.map((m) => <option key={m.slug} value={m.slug}>{m.label}</option>)}
                </select>
              </Field>
              <Field label="Откуда" htmlFor={`ql-s-${c.key}`}>
                <select id={`ql-s-${c.key}`} className="ax-input" value={c.source} onChange={(e) => update(c.key, { source: e.target.value })}>
                  {Object.entries(sources).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </Field>
              <Field label="Встреча" htmlFor={`ql-t-${c.key}`} hint={c.meetingText ? `В тексте: «${c.meetingText}»` : "Если договорились о встрече"}>
                <input id={`ql-t-${c.key}`} type="datetime-local" className="ax-input" value={c.meetingAt} onChange={(e) => update(c.key, { meetingAt: e.target.value })} />
              </Field>
            </div>
            <Field label="Что известно о клиенте" htmlFor={`ql-c-${c.key}`}><textarea id={`ql-c-${c.key}`} className="ax-input" rows={4} value={c.comment} onChange={(e) => update(c.key, { comment: e.target.value })} /></Field>
            <details><summary className="ax-small" style={{ cursor: "pointer" }}>Исходный текст</summary><pre className="ax-small" style={{ whiteSpace: "pre-wrap", margin: "8px 0 0", fontFamily: "inherit" }}>{c.raw}</pre></details>
          </article>
        );
      })}

      {cards.length ? (
        <div className="ax-card" style={{ position: "sticky", bottom: 12, zIndex: 2, display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end", boxShadow: "var(--shadow-lg, 0 8px 24px rgba(0,0,0,.12))" }}>
          <div style={{ flex: "1 1 240px" }}>
            <Field label="Кому отдать" htmlFor="ql-who" hint={assignee ? "Заявки сразу будут «В работе» у этого сотрудника, он получит уведомление" : "Заявки попадут в «Новые», их возьмёт любой менеджер"}>
              <select id="ql-who" className="ax-input" value={assignee} onChange={(e) => setAssignee(e.target.value)}>
                <option value="">В «Новые» для всех</option>
                <option value={me}>Взять себе</option>
                {sellers.filter((s) => s.id !== me).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </Field>
          </div>
          <div style={{ display: "grid", gap: 6 }}>
            {error ? <div className="ax-error" role="alert">{error}</div> : null}
            <button type="button" className="ax-btn ax-btn-primary" disabled={saving || !chosen.length} onClick={save} style={{ marginBottom: 14 }}>
              {saving ? <LoaderCircle size={17} className="ax-spin" aria-hidden /> : <Send size={17} aria-hidden />}Отправить в заявки ({chosen.length})
            </button>
          </div>
        </div>
      ) : error ? <div className="ax-error" role="alert">{error}</div> : null}
    </div>
  );
}
