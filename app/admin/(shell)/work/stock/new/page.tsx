import { notFound } from "next/navigation";
import { requireSection, seesCost } from "../../../../_lib/session";
import { canIntake } from "../../../../_lib/stock";
import { catalogModels } from "../../../../_lib/sales";
import { PageHeader } from "../../../../_ui/ui";
import { NewUnitsForm } from "./new-units-form";

export const metadata = { title: "Приход техники" };

export default async function NewUnits() {
  const { actor } = await requireSection("/admin/work/stock");
  if (!canIntake(actor)) notFound();
  const models = await catalogModels();
  return (
    <div style={{ maxWidth: 1240 }}>
      <PageHeader title="Приход техники" subtitle="Машины, которые уже стоят на складе. Если машина едет от завода, оформляйте её через Логистику: так посчитаются расходы поставки." />
      <NewUnitsForm models={models.map((m) => ({ slug: m.slug, model: m.model }))} canCost={seesCost(actor)} />
    </div>
  );
}
