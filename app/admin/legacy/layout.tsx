/**
 * Прежняя админка закрыта: все разделы переехали в новую (/admin). Остаётся архивом только для владельца,
 * чтобы посмотреть историю старой CRM, чат и задачи. Остальные сотрудники попадают в новую админку.
 */
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireStaff } from "../_lib/session";

export default async function LegacyLayout({ children }: LayoutProps<"/admin/legacy">) {
  const actor = await requireStaff("/admin/legacy");
  if (actor.role !== "owner") redirect("/admin");
  return (
    <>
      <div role="note" style={{ position: "sticky", top: 0, zIndex: 1000, padding: "8px 14px", background: "#fff6e0", color: "#6b4b00", fontSize: 13.5, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", borderBottom: "1px solid #ecd9a2", fontFamily: "system-ui, sans-serif" }}>
        <b>Архив старой админки.</b>
        <span>Видите только вы. Продажи, платежи, склад и сайт ведутся в новой админке; здесь не меняйте данные, только смотрите историю.</span>
        <Link href="/admin" style={{ marginLeft: "auto", fontWeight: 700, color: "#2f7d4f" }}>В новую админку →</Link>
      </div>
      {children}
    </>
  );
}
