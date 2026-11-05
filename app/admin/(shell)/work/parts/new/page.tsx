import { notFound } from "next/navigation";
import { requireStaff } from "../../../../_lib/session";
import { canPartsCard, canPartsStock, PART_CATEGORIES, seesPartCost } from "../../../../_lib/parts";
import { listModels } from "../../../../_lib/catalog-admin";
import { PageHeader } from "../../../../_ui/ui";
import { PartForm } from "../part-form";

export const metadata = { title: "Новая запчасть" };

export default async function NewPart() {
  const actor = await requireStaff("/admin/work/parts/new");
  if (!canPartsCard(actor)) notFound();
  const models = (await listModels()).filter((m) => m.status !== "archived").map((m) => ({ slug: m.slug, model: m.model }));
  return (
    <div style={{ maxWidth: 860 }}>
      <PageHeader title="Новая запчасть" subtitle="Артикул уникален. Остаток потом меняется только движениями: приход, продажа, списание." />
      <PartForm categories={PART_CATEGORIES} models={models} seesCost={seesPartCost(actor)} canStock={canPartsStock(actor)}
        initial={{ sku: "", name: "", category: PART_CATEGORIES[0], models: [], unit: "шт", price: "", cost: "", minQty: "0", location: "", image: "", description: "", showOnSite: false, openingQty: "" }} />
    </div>
  );
}
