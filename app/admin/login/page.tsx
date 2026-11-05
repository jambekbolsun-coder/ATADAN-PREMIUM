import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import "../_ui/admin.css";
import { currentTheme } from "../_ui/theme-server";
import { getServerActor } from "../_lib/session";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Вход · ATADAN", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

/** Разрешаем возврат только внутрь админки: защита от открытого редиректа. */
function safeNext(value: string | string[] | undefined) {
  const next = typeof value === "string" ? value : "";
  return next.startsWith("/admin") && !next.startsWith("//") && !next.includes("\\") ? next : "/admin";
}

export default async function LoginPage({ searchParams }: PageProps<"/admin/login">) {
  const sp = await searchParams;
  const next = safeNext(sp.next);
  if (await getServerActor()) redirect(next);
  return (
    <div className="ax" data-ax-theme={await currentTheme()}>
      <main className="ax-auth">
        <div className="ax-auth-in">
          <Link href="/" className="ax-auth-brand" aria-label="ATADAN: перейти на сайт">
            <span className="ax-logo-tile">A</span>
            <span>
              <b>ATADAN</b>
              <small>Официальный дистрибьютор Changfa</small>
            </span>
          </Link>
          <div className="ax-card">
            <h1>Вход в ATADAN</h1>
            <div className="ax-auth-sub">Рабочее пространство компании</div>
            <LoginForm next={next} />
            <p className="ax-small" style={{ margin: "16px 0 0" }}>Доступ только по персональному приглашению. Общих паролей нет.</p>
          </div>
          <div className="ax-auth-foot">
            <details>
              <summary style={{ cursor: "pointer", listStyle: "none" }}>Забыли пароль?</summary>
              <p className="ax-small" style={{ margin: "8px 0 0", maxWidth: 300 }}>
                Попросите владельца или директора создать ссылку для нового пароля: Настройки → Сотрудники → ваша карточка.
              </p>
            </details>
            <Link href="/">На сайт</Link>
          </div>
        </div>
      </main>
    </div>
  );
}
