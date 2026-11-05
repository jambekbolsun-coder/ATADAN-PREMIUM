import { requireStaff } from "../../../_lib/session";
import { PageHeader } from "../../../_ui/ui";
import { SecurityPanel } from "./security-panel";

export const metadata = { title: "Пароль и сеансы" };

export default async function Security() {
  const actor = await requireStaff("/admin/settings/security");
  const strict = actor.role === "owner" || actor.role === "director";
  return (
    <div style={{ maxWidth: 760 }}>
      <PageHeader title="Пароль и сеансы" subtitle="Смена пароля завершит вход на всех других устройствах" />
      <SecurityPanel minLength={strict ? 12 : 8} />
    </div>
  );
}
