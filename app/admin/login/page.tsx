import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import "../_ui/admin.css";
import "./login.css";
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
    <div className="ax">
      <main className="axl">
        <div className="axl-wrap">
          <LoginForm next={next} />
          <Link href="/" className="axl-back">← На сайт atadan.kg</Link>
        </div>
      </main>
    </div>
  );
}
