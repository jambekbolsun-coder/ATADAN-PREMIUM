import Link from "next/link";
import { revalidatePath } from "next/cache";
import { getRawDb } from "../../../../db";
import { requireStaff } from "../../_lib/session";
import { ago } from "../../_lib/format";
import { Badge, Card, Empty, PageHeader } from "../../_ui/ui";

export const metadata = { title: "Уведомления" };

type Row = { id: string; title: string; body: string; priority: string; target_url: string | null; read_at: string | null; created_at: string };

/** Старые ссылки уведомлений (/admin/company/…) сами перенаправляются в новые разделы. */
function target(url: string | null) {
  if (!url || !url.startsWith("/admin")) return null;
  return url;
}

async function markAllRead() {
  "use server";
  const actor = await requireStaff("/admin/notifications");
  await getRawDb().prepare("UPDATE notifications_v2 SET read_at=CURRENT_TIMESTAMP WHERE recipient_id=? AND read_at IS NULL").bind(actor.id).run();
  revalidatePath("/admin", "layout");
}

export default async function Notifications() {
  const actor = await requireStaff("/admin/notifications");
  const { results } = await getRawDb()
    .prepare("SELECT id,title,body,priority,target_url,read_at,created_at FROM notifications_v2 WHERE recipient_id=? AND archived=0 ORDER BY created_at DESC LIMIT 100")
    .bind(actor.id)
    .all<Row>();
  const unread = results.filter((r) => !r.read_at).length;
  return (
    <div style={{ maxWidth: 760 }}>
      <PageHeader
        title="Уведомления"
        subtitle={unread ? `Непрочитанных: ${unread}` : "Все прочитаны"}
        actions={unread ? <form action={markAllRead}><button className="ax-btn">Отметить все прочитанными</button></form> : null}
      />
      <Card flush>
        {results.length ? (
          <div className="ax-list">
            {results.map((n) => {
              const href = target(n.target_url);
              const body = (
                <>
                  <span className="ax-row-body">
                    <span className="ax-row-t" style={{ fontWeight: n.read_at ? 500 : 700 }}>{n.title}</span>
                    {n.body ? <span className="ax-row-s">{n.body}</span> : null}
                  </span>
                  <span className="ax-row-end">
                    {n.priority === "high" ? <Badge tone="bad">Срочно</Badge> : null}
                    <span className="ax-small">{ago(n.created_at)}</span>
                  </span>
                </>
              );
              return href ? (
                <Link key={n.id} href={href} className="ax-list-row" style={{ padding: "12px 16px" }}>{body}</Link>
              ) : (
                <div key={n.id} className="ax-list-row" style={{ padding: "12px 16px" }}>{body}</div>
              );
            })}
          </div>
        ) : (
          <Empty icon="bell" title="Уведомлений нет" text="Здесь появятся новые заявки, платежи, просрочки и опаздывающие поставки." />
        )}
      </Card>
    </div>
  );
}
