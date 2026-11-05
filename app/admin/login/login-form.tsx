"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Eye, EyeOff, LoaderCircle } from "lucide-react";

export function LoginForm({ next }: { next: string }) {
  const router = useRouter();
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(form: FormData) {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/admin/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: String(form.get("email") ?? ""), password: String(form.get("password") ?? "") }),
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
    <form action={submit} noValidate={false}>
      <div className="ax-field">
        <label className="ax-label" htmlFor="ax-email">Электронная почта</label>
        <input id="ax-email" name="email" type="text" inputMode="email" autoCapitalize="none" spellCheck={false} className="ax-input" autoComplete="username" required placeholder="name@atadan.kg" aria-invalid={error ? true : undefined} aria-describedby={error ? "ax-login-error" : undefined} />
      </div>
      <div className="ax-field">
        <label className="ax-label" htmlFor="ax-password">Пароль</label>
        <div className="ax-pass">
          <input id="ax-password" name="password" type={show ? "text" : "password"} className="ax-input" autoComplete="current-password" required minLength={1} maxLength={128} aria-invalid={error ? true : undefined} aria-describedby={error ? "ax-login-error" : undefined} />
          <button type="button" className="ax-tap" onClick={() => setShow((v) => !v)} aria-label={show ? "Скрыть пароль" : "Показать пароль"}>
            {show ? <EyeOff size={18} aria-hidden /> : <Eye size={18} aria-hidden />}
          </button>
        </div>
      </div>
      {error ? <div id="ax-login-error" className="ax-error" role="alert" style={{ marginBottom: 10 }}>{error}</div> : null}
      <button type="submit" className="ax-btn ax-btn-primary ax-btn-block" style={{ height: 46, fontSize: 15 }} disabled={busy}>
        {busy ? <LoaderCircle size={18} className="ax-spin" aria-hidden /> : null}
        {busy ? "Входим…" : "Войти"}
      </button>
    </form>
  );
}
