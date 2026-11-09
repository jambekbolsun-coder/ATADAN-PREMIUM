import { requireStaff } from "../../_lib/session";
import { visibleSettings } from "../../_lib/nav";
import { ROLE_LABEL } from "../../_lib/roles";
import { Avatar, Grouped, PageHeader, RowLink } from "../../_ui/ui";
import { LogoutButton } from "../../_ui/client";
import { InstallCard } from "../../_ui/install";
import Link from "next/link";

export const metadata = { title: "Настройки" };

export default async function Settings() {
  const actor = await requireStaff("/admin/settings");
  const groups = visibleSettings(actor);
  return (
    <div style={{ maxWidth: 760 }}>
      <PageHeader title="Настройки" />
      <Link href="/admin/settings/profile" className="ax-card" style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 18 }}>
        <Avatar name={actor.display_name} url={actor.avatar} size={52} />
        <span style={{ minWidth: 0 }}>
          <b style={{ fontSize: 16, display: "block" }}>{actor.display_name || actor.email}</b>
          <span className="ax-small">{ROLE_LABEL[actor.role]} · {actor.email}</span>
        </span>
      </Link>
      {groups.map((g) => (
        <Grouped key={g.title} title={g.title}>
          {g.items.map((i) => <RowLink key={i.href} href={i.href} icon={i.icon} tone={i.tone} label={i.label} hint={i.hint} />)}
        </Grouped>
      ))}
      <Grouped title="Помощь"><RowLink href="/admin/work/guide" icon="book" tone="lilac" label="Инструкции" hint="Как работать в админке, по шагам и с картинками" /></Grouped>
      <InstallCard />
      <LogoutButton className="ax-btn-block" label="Выйти из аккаунта" />
    </div>
  );
}
