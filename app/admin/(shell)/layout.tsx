import type { Metadata, Viewport } from "next";
import "../_ui/admin.css";
import { getRawDb } from "../../../db";
import { AdminShell } from "../_ui/shell";
import { InstallBanner, InstallSetup } from "../_ui/install";
import { currentTheme } from "../_ui/theme-server";
import { requireStaff } from "../_lib/session";
import { canSee, NAV, roleTab, visibleNav, visiblePlus } from "../_lib/nav";
import { ROLE_LABEL } from "../_lib/roles";

export const metadata: Metadata = {
  title: { default: "ATADAN · админ-панель", template: "%s · ATADAN" },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#0b2e1f",
  viewportFit: "cover",
};

export const dynamic = "force-dynamic";

export default async function ShellLayout({ children }: LayoutProps<"/admin">) {
  const [actor, theme] = await Promise.all([requireStaff(), currentTheme()]);
  const db = getRawDb();
  const leadsItem = NAV.find((i) => i.href === "/admin/work/leads")!;
  const [unread, newLeads] = await Promise.all([
    db.prepare("SELECT COUNT(*)::int AS n FROM notifications_v2 WHERE recipient_id=? AND read_at IS NULL AND archived=0").bind(actor.id).first<{ n: number }>(),
    canSee(actor, leadsItem) ? db.prepare("SELECT COUNT(*)::int AS n FROM leads WHERE status='new'").first<{ n: number }>() : Promise.resolve(null),
  ]);
  return (
    <div className="ax" data-ax-theme={theme}>
      <script async src="/admin-install.js" />
      <InstallSetup />
      <AdminShell
        nav={visibleNav(actor)}
        user={{ name: actor.display_name || actor.email, role: ROLE_LABEL[actor.role], avatar: actor.avatar }}
        plus={visiblePlus(actor)}
        tab={roleTab(actor)}
        unread={unread?.n ?? 0}
        counts={{ "/admin/work/leads": newLeads?.n ?? 0 }}
      >
        <InstallBanner />
        {children}
      </AdminShell>
    </div>
  );
}
