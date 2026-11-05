"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Eye, EyeOff, LoaderCircle, Lock, User } from "lucide-react";

export function LoginForm({ next }: { next: string }) {
  const router = useRouter();
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [help, setHelp] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/admin/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: String(form.get("email") ?? ""), password: String(form.get("password") ?? ""), remember: form.get("remember") === "on" }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(res.status === 429 ? "Слишком много попыток. Подождите 15 минут и попробуйте снова." : data.error || "Не удалось войти. Проверьте email и пароль.");
        return;
      }
      router.replace(next);
      router.refresh();
    } catch {
      setError("Нет связи с сервером. Проверьте интернет и повторите.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="axl-card" onSubmit={submit} aria-labelledby="axl-title">
      <div className="axl-avatar" aria-hidden>
        <User size={46} strokeWidth={1.4} />
      </div>
      <h1 id="axl-title" className="axl-title">ATADAN</h1>
      <p className="axl-sub">Вход в админ-панель</p>

      <label className="axl-field">
        <span className="axl-ic" aria-hidden><User size={17} /></span>
        <span className="ax-sr">Электронная почта</span>
        <input name="email" type="text" inputMode="email" autoCapitalize="none" spellCheck={false} autoComplete="username" required placeholder="Электронная почта" aria-invalid={error ? true : undefined} aria-describedby={error ? "axl-error" : undefined} />
      </label>
      <label className="axl-field">
        <span className="axl-ic" aria-hidden><Lock size={16} /></span>
        <span className="ax-sr">Пароль</span>
        <input name="password" type={show ? "text" : "password"} autoComplete="current-password" required maxLength={128} placeholder="Пароль" aria-invalid={error ? true : undefined} aria-describedby={error ? "axl-error" : undefined} />
        <button type="button" className="axl-eye" onClick={() => setShow((v) => !v)} aria-label={show ? "Скрыть пароль" : "Показать пароль"}>
          {show ? <EyeOff size={17} aria-hidden /> : <Eye size={17} aria-hidden />}
        </button>
      </label>

      <div className="axl-row">
        <label className="axl-remember">
          <input type="checkbox" name="remember" /> Запомнить меня
        </label>
        <button type="button" className="axl-link" onClick={() => setHelp((v) => !v)} aria-expanded={help} aria-controls="axl-help">Забыли пароль?</button>
      </div>
      {help ? (
        <p id="axl-help" className="axl-help">
          Попросите владельца или директора создать ссылку для нового пароля: Настройки → Сотрудники → ваша карточка.
        </p>
      ) : null}

      {error ? <div id="axl-error" className="axl-error" role="alert">{error}</div> : null}

      <button type="submit" className="axl-submit" disabled={busy}>
        {busy ? <LoaderCircle size={18} className="ax-spin" aria-hidden /> : null}
        {busy ? "Входим…" : "Войти"}
      </button>
      <p className="axl-note">«Запомнить меня» оставляет вход на 30 дней, без галочки на 8 часов. На чужом компьютере не отмечайте.</p>
    </form>
  );
}
