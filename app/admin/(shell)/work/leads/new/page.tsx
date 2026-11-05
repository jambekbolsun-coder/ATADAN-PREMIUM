import { requireSection } from "../../../../_lib/session";
import { catalogModels } from "../../../../_lib/sales";
import { notFound } from "next/navigation";
import { PageHeader } from "../../../../_ui/ui";
import { NewLeadForm } from "./new-lead-form";

export const metadata = { title: "Новая заявка" };

export default async function NewLead() {
  const { actor } = await requireSection("/admin/work/leads");
  if (actor.role === "marketer") notFound();
  const models = await catalogModels();
  return (
    <div style={{ maxWidth: 640 }}>
      <PageHeader title="Новая заявка" subtitle="Звонок, визит в офис, WhatsApp или выставка. Заявка сразу будет у вас в работе" />
      <div className="ax-card"><NewLeadForm models={models.map((m) => ({ slug: m.slug, label: `${m.model} · ${m.hp} л.с.` }))} /></div>
    </div>
  );
}
