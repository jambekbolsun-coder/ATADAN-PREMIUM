import { getRawDb } from "../../../../../../db";
import { requireSection } from "../../../../_lib/session";
import { SERVICE_KIND } from "../../../../_lib/service";
import { salesPolicy } from "../../../../_lib/sales";
import { PageHeader } from "../../../../_ui/ui";
import { NewTicketForm } from "./new-ticket-form";

export const metadata = { title: "Новое обращение" };

export default async function NewTicket() {
  const { actor } = await requireSection("/admin/work/service");
  const [staff, policy] = await Promise.all([
    getRawDb().prepare("SELECT id, display_name AS name FROM staff WHERE active=1 ORDER BY display_name").all<{ id: string; name: string }>(),
    salesPolicy(),
  ]);
  return (
    <div style={{ maxWidth: 820 }}>
      <PageHeader title="Новое обращение" subtitle={`Найдите машину по VIN или клиенту. Гарантия: ${policy.warrantyMonths} мес.${policy.warrantyHours ? ` или ${policy.warrantyHours} моточасов` : ""} с даты выдачи.`} />
      <NewTicketForm kinds={SERVICE_KIND} staff={staff.results} me={actor.id} warrantyMonths={policy.warrantyMonths} today={new Date().toISOString().slice(0, 10)} />
    </div>
  );
}
