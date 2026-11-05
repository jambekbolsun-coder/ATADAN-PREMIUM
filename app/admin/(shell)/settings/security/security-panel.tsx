"use client";
import { useCallback, useEffect, useState } from "react";
import { LoaderCircle, Monitor, Smartphone } from "lucide-react";
import { Badge, Card, Notice } from "../../../_ui/ui";
import { LogoutButton } from "../../../_ui/client";
import { dateTime } from "../../../_lib/format";

type Session = { id: string; created_at: string; last_seen_at: string | null; user_agent: string | null; current: boolean };

function device(ua: string | null) {
  const s = ua ?? "";
  const mobile = /iPhone|Android|Mobile/i.test(s);
  const os = /iPhone|iPad/.test(s) ? "iPhone / iPad" : /Android/.test(s) ? "Android" : /Windows/.test(s) ? "Windows" : /Mac OS/.test(s) ? "Mac" : "Устройство";
  const br = /Edg\//.test(s) ? "Edge" : /Chrome\//.test(s) ? "Chrome" : /Safari\//.test(s) ? "Safari" : /Firefox\//.test(s) ? "Firefox" : "";
  return { mobile, label: [os, br].filter(Boolean).join(" · ") };
}

async function fetchSessions() {
  const res = await fetch("/api/admin/security", { cache: "no-store" });
  if (!res.ok) throw new Error();
  return ((await res.json()) as { sessions: Session[] }).sessions;
}

async function post(body: Record<string, unknown>) {
  const res = await fetch("/api/admin/security", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = (await res.json().catch(() => ({}))) as { error?: string };
  if (!res.ok) throw new Error(data.error || "Не удалось выполнить действие");
  return data;
}

export function SecurityPanel({ minLength }: { minLength: number }) {
  const [sessions, setSessions] = useState<Session[] | null>(null);
  const [loadError, setLoadError] = useState("");
  const [pwd, setPwd] = useState({ busy: false, error: "", ok: "" });
  const [busyId, setBusyId] = useState<string | null>(null);
  const [listError, setListError] = useState("");

  const load = useCallback(async () => {
    try {
      setSessions(await fetchSessions());
      setLoadError("");
    } catch {
      setLoadError("Не удалось загрузить список устройств.");
    }
  }, []);
  useEffect(() => {
    let alive = true;
    fetchSessions()
      .then((list) => alive && setSessions(list))
      .catch(() => alive && setLoadError("Не удалось загрузить список устройств."));
    return () => {
      alive = false;
    };
  }, []);

  async function changePassword(form: FormData) {
    const current = String(form.get("current") ?? ""), next = String(form.get("next") ?? ""), repeat = String(form.get("repeat") ?? "");
    if (next.length < minLength) return setPwd({ busy: false, error: `Новый пароль: не короче ${minLength} символов`, ok: "" });
    if (next !== repeat) return setPwd({ busy: false, error: "Пароли не совпадают", ok: "" });
    setPwd({ busy: true, error: "", ok: "" });
    try {
      await post({ action: "change_password", currentPassword: current, newPassword: next });
      setPwd({ busy: false, error: "", ok: "Пароль изменён. На других устройствах нужно войти заново." });
      void load();
    } catch (e) {
      setPwd({ busy: false, error: (e as Error).message, ok: "" });
    }
  }

  async function revoke(id: string | "others") {
    setBusyId(id);
    setListError("");
    try {
      await post(id === "others" ? { action: "revoke_others" } : { action: "revoke_session", id });
      await load();
    } catch (e) {
      setListError((e as Error).message);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="ax-grid">
      <Card title="Сменить пароль">
        <form action={changePassword}>
          <div className="ax-field"><label className="ax-label" htmlFor="pw-cur">Текущий пароль</label><input id="pw-cur" name="current" type="password" className="ax-input" autoComplete="current-password" required /></div>
          <div className="ax-grid ax-g2" style={{ gap: 12 }}>
            <div className="ax-field"><label className="ax-label" htmlFor="pw-new">Новый пароль</label><input id="pw-new" name="next" type="password" className="ax-input" autoComplete="new-password" required minLength={minLength} /><div className="ax-hint">Не короче {minLength} символов</div></div>
            <div className="ax-field"><label className="ax-label" htmlFor="pw-rep">Повторите</label><input id="pw-rep" name="repeat" type="password" className="ax-input" autoComplete="new-password" required /></div>
          </div>
          {pwd.error ? <div className="ax-error" role="alert" style={{ marginBottom: 10 }}>{pwd.error}</div> : null}
          {pwd.ok ? <div style={{ marginBottom: 10 }}><Notice tone="good">{pwd.ok}</Notice></div> : null}
          <button className="ax-btn ax-btn-primary" disabled={pwd.busy}>{pwd.busy ? <LoaderCircle size={17} className="ax-spin" aria-hidden /> : null}Сохранить пароль</button>
        </form>
      </Card>

      <Card title="Где выполнен вход">
        {loadError ? <Notice tone="bad">{loadError} <button className="ax-btn ax-btn-sm" onClick={() => void load()}>Повторить</button></Notice> : null}
        {!sessions && !loadError ? <div className="ax-small">Загружаем…</div> : null}
        {sessions ? (
          <div className="ax-list">
            {sessions.map((s) => {
              const d = device(s.user_agent);
              return (
                <div key={s.id} className="ax-list-row">
                  <span className="ax-ic ax-ic-sm ax-c-sky">{d.mobile ? <Smartphone size={16} aria-hidden /> : <Monitor size={16} aria-hidden />}</span>
                  <span className="ax-row-body">
                    <span className="ax-row-t">{d.label} {s.current ? <Badge tone="good">Это устройство</Badge> : null}</span>
                    <span className="ax-row-s">Вход {dateTime(s.created_at)} · активность {dateTime(s.last_seen_at ?? s.created_at)}</span>
                  </span>
                  {s.current ? null : (
                    <button className="ax-btn ax-btn-sm" disabled={busyId === s.id} onClick={() => void revoke(s.id)}>Завершить</button>
                  )}
                </div>
              );
            })}
          </div>
        ) : null}
        {listError ? <div className="ax-error" role="alert">{listError}</div> : null}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 14 }}>
          <button className="ax-btn" disabled={busyId === "others" || (sessions?.length ?? 0) < 2} title={(sessions?.length ?? 0) < 2 ? "Других устройств нет" : undefined} onClick={() => void revoke("others")}>Выйти на всех других устройствах</button>
          <LogoutButton />
        </div>
      </Card>
    </div>
  );
}
