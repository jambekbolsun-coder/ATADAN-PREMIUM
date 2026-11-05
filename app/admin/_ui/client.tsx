"use client";
/** Небольшие клиентские кнопки и виджеты, которые нужны на серверных страницах. */
import { useRouter } from "next/navigation";
import { useState } from "react";
import { LoaderCircle, LogOut } from "lucide-react";
import { AX_THEME_COOKIE, AX_THEMES, type AxTheme } from "./theme";
import { cn } from "./ui";

export function LogoutButton({ className, label = "Выйти" }: { className?: string; label?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <>
      <button
        type="button"
        className={cn("ax-btn ax-btn-danger", className)}
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setError("");
          try {
            const res = await fetch("/api/admin/session", { method: "DELETE" });
            if (!res.ok) throw new Error();
            router.replace("/admin/login");
            router.refresh();
          } catch {
            setError("Не удалось выйти. Проверьте интернет и повторите.");
            setBusy(false);
          }
        }}
      >
        {busy ? <LoaderCircle size={17} className="ax-spin" aria-hidden /> : <LogOut size={17} aria-hidden />}
        {label}
      </button>
      {error ? <div className="ax-error" role="alert">{error}</div> : null}
    </>
  );
}

/** Cookie на год только для раздела /admin: сервер прочитает её и сразу нарисует выбранную тему. */
function saveThemeCookie(key: AxTheme) {
  document.cookie = `${AX_THEME_COOKIE}=${key}; path=/admin; max-age=31536000; samesite=lax`;
}

export function ThemePicker({ initial }: { initial: AxTheme }) {
  const [theme, setTheme] = useState<AxTheme>(initial);
  function choose(key: AxTheme) {
    setTheme(key);
    document.querySelectorAll(".ax").forEach((el) => el.setAttribute("data-ax-theme", key));
    saveThemeCookie(key);
  }
  return (
    <div className="ax-themes" role="group" aria-label="Тема">
      {AX_THEMES.map((t) => (
        <button key={t.key} type="button" className="ax-theme" aria-pressed={theme === t.key} onClick={() => choose(t.key)}>
          <span className="ax-theme-pv" aria-hidden>
            <i style={{ width: "28%", background: t.preview[0] }} />
            <i style={{ flex: 1, background: t.preview[1] }} />
            <i style={{ width: "18%", background: t.preview[2] }} />
          </span>
          {t.label}
          <span className="ax-row-s" style={{ fontWeight: 400 }}>{t.hint}</span>
        </button>
      ))}
    </div>
  );
}
