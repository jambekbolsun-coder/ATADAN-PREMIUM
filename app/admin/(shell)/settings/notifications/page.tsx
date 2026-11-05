import Link from "next/link";
import { requireStaff } from "../../../_lib/session";
import { NOTIFY_KEYS, notifyPrefs } from "../../../_lib/team";
import { PageHeader } from "../../../_ui/ui";
import { NotifyToggles } from "../forms";

export const metadata = { title: "Уведомления" };

export default async function NotifySettings() {
  const actor = await requireStaff("/admin/settings/notifications");
  const prefs = await notifyPrefs(actor);
  const items = NOTIFY_KEYS.filter((k) => !k.roles || k.roles.includes(actor.role));
  return (
    <div style={{ maxWidth: 680 }}>
      <PageHeader title="Уведомления" subtitle={<>О чём сообщать в колокольчике. Все уведомления: <Link href="/admin/notifications" style={{ color: "var(--brand)" }}>открыть</Link>. Заявки, назначенные лично вам, приходят всегда.</>} />
      <NotifyToggles items={items} initial={prefs} />
    </div>
  );
}
