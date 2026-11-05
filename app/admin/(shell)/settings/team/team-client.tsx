"use client";
import { useState, useTransition } from "react";
import { Copy, KeyRound, LoaderCircle, UserPlus } from "lucide-react";
import { inviteAction, permissionsAction, resetLinkAction } from "../../../_lib/settings-actions";
import { Field, Toast } from "../../../_ui/forms";

type Group = { title: string; items: [string, string][] };
type Role = { key: string; label: string; hint: string };

function CopyLink({ url, note }: { url: string; note: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="ax-notice ax-n-good" style={{ display: "grid", gap: 8 }}>
      <p style={{ margin: 0 }}>{note}</p>
      <div style={{ display: "flex", gap: 6 }}>
        <input className="ax-input num" readOnly value={url} onFocus={(e) => e.target.select()} aria-label="Ссылка" />
        <button type="button" className="ax-btn" onClick={async () => { await navigator.clipboard.writeText(url); setCopied(true); }}><Copy size={15} aria-hidden />{copied ? "Скопировано" : "Копировать"}</button>
      </div>
    </div>
  );
}

function PermGrid({ groups, value, onChange }: { groups: Group[]; value: string[]; onChange: (v: string[]) => void }) {
  return (
    <div className="ax-grid ax-g2" style={{ gap: 10 }}>
      {groups.map((g) => (
        <fieldset key={g.title} style={{ border: "1px solid var(--border)", borderRadius: 12, padding: "8px 12px", margin: 0 }}>
          <legend className="ax-small" style={{ padding: "0 4px" }}>{g.title}</legend>
          {g.items.map(([k, label]) => (
            <label key={k} className="ax-check"><input type="checkbox" checked={value.includes(k)} onChange={(e) => onChange(e.target.checked ? [...value, k] : value.filter((x) => x !== k))} /> {label}</label>
          ))}
        </fieldset>
      ))}
    </div>
  );
}

export function InvitePanel({ roles, groups, defaults }: { roles: Role[]; groups: Group[]; defaults: Record<string, string[]> }) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState(roles[0].key);
  const [perms, setPerms] = useState<string[]>(defaults[roles[0].key]);
  const [error, setError] = useState("");
  const [link, setLink] = useState<{ url: string; expiresAt: string } | null>(null);
  const [pending, start] = useTransition();
  if (!open) return <button type="button" className="ax-btn ax-btn-primary" onClick={() => { setOpen(true); setLink(null); }}><UserPlus size={17} aria-hidden />Пригласить сотрудника</button>;
  return (
    <section className="ax-card" style={{ borderColor: "var(--brand)", marginBottom: 14 }}>
      <h3 className="ax-card-h">Приглашение</h3>
      {link ? (
        <>
          <CopyLink url={link.url} note={`Отправьте ссылку сотруднику (WhatsApp, Telegram). Она работает 24 часа и один раз: до ${new Date(link.expiresAt).toLocaleString("ru-RU")}. Сотрудник сам задаст пароль.`} />
          <button type="button" className="ax-btn" style={{ marginTop: 10 }} onClick={() => { setOpen(false); setEmail(""); }}>Готово</button>
        </>
      ) : (
        <>
          <div className="ax-grid ax-g2" style={{ gap: 12 }}>
            <Field label="Email сотрудника" htmlFor="inv-email" hint="Им он будет входить"><input id="inv-email" className="ax-input" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
            <Field label="Роль" htmlFor="inv-role" hint={roles.find((r) => r.key === role)?.hint}><select id="inv-role" className="ax-input" value={role} onChange={(e) => { setRole(e.target.value); setPerms(defaults[e.target.value]); }}>{roles.map((r) => <option key={r.key} value={r.key}>{r.label}</option>)}</select></Field>
          </div>
          <details style={{ marginBottom: 10 }}><summary className="ax-small" style={{ cursor: "pointer" }}>Доступ к разделам ({perms.length}). По умолчанию как у роли</summary><div style={{ marginTop: 8 }}><PermGrid groups={groups} value={perms} onChange={setPerms} /></div></details>
          {error ? <div className="ax-error" role="alert" style={{ marginBottom: 10 }}>{error}</div> : null}
          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" className="ax-btn ax-btn-primary" disabled={pending} onClick={() => { setError(""); start(async () => { const r = await inviteAction({ email, role, permissions: perms }); if (!r.ok || !r.data) setError(r.error ?? "Не получилось"); else setLink(r.data); }); }}>{pending ? <LoaderCircle size={17} className="ax-spin" aria-hidden /> : null}Создать ссылку</button>
            <button type="button" className="ax-btn ax-btn-ghost" onClick={() => setOpen(false)}>Отмена</button>
          </div>
        </>
      )}
    </section>
  );
}

export function PermEditor({ id, groups, initial }: { id: string; groups: Group[]; initial: string[] }) {
  const [open, setOpen] = useState(false);
  const [perms, setPerms] = useState(initial);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  if (!open) return <button type="button" className="ax-btn ax-btn-sm" onClick={() => setOpen(true)}>Доступы ({initial.length})</button>;
  return (
    <div style={{ gridColumn: "1 / -1", width: "100%", marginTop: 8 }}>
      <PermGrid groups={groups} value={perms} onChange={setPerms} />
      {error ? <div className="ax-error" role="alert" style={{ marginTop: 8 }}>{error}</div> : null}
      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
        <button type="button" className="ax-btn ax-btn-sm ax-btn-primary" disabled={pending} onClick={() => start(async () => { const r = await permissionsAction(id, perms); if (r.ok) { setMsg(r.message ?? ""); setOpen(false); } else setError(r.error ?? ""); })}>Сохранить доступы</button>
        <button type="button" className="ax-btn ax-btn-sm ax-btn-ghost" onClick={() => setOpen(false)}>Отмена</button>
      </div>
      {msg ? <Toast text={msg} onDone={() => setMsg("")} /> : null}
    </div>
  );
}

export function ResetLink({ id }: { id: string }) {
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  return (
    <>
      <button type="button" className="ax-btn ax-btn-sm" disabled={pending} onClick={() => start(async () => { setError(""); const r = await resetLinkAction(id); if (r.ok && r.data) setUrl(r.data.url); else setError(r.error ?? ""); })}><KeyRound size={14} aria-hidden />Сброс пароля</button>
      {url ? <div style={{ gridColumn: "1 / -1", width: "100%", marginTop: 8 }}><CopyLink url={url} note="Ссылка для нового пароля работает 30 минут и один раз. Передайте её сотруднику лично." /></div> : null}
      {error ? <span className="ax-error" role="alert">{error}</span> : null}
    </>
  );
}
