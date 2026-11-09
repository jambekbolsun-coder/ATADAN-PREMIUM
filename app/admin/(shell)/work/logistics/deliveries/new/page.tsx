import { notFound } from "next/navigation";
import { requireSection } from "../../../../../_lib/session";
import { canLogistics } from "../../../../../_lib/stock";
import { catalogModels } from "../../../../../_lib/sales";
import { DELIVERY_KIND, saleDeliveryDraft } from "../../../../../_lib/deliveries";
import { PageHeader } from "../../../../../_ui/ui";
import { DeliveryForm } from "../delivery-form";

export const metadata = { title: "Новая перевозка" };

export default async function NewDelivery({ searchParams }: PageProps<"/admin/work/logistics/deliveries/new">) {
  const { actor } = await requireSection("/admin/work/logistics");
  if (!canLogistics(actor)) notFound();
  const sp = await searchParams;
  const [models, draft] = await Promise.all([catalogModels(), typeof sp.sale === "string" ? saleDeliveryDraft(sp.sale) : null]);
  const place = draft ? [draft.sale.region, draft.sale.address].filter(Boolean).join(", ") : "";
  return (
    <div style={{ maxWidth: 820 }}>
      <PageHeader title="Новая перевозка" subtitle={draft ? `По продаже ${draft.sale.number}` : "Кому, откуда, куда, когда и какие модели"} />
      <DeliveryForm
        kinds={DELIVERY_KIND}
        models={models.map((m) => ({ slug: m.slug, model: m.model }))}
        initial={{ kind: "to_client", clientName: draft?.sale.name ?? "", clientPhone: draft?.sale.phone ?? "", saleId: draft?.sale.id ?? "", customerId: draft?.sale.customer_id ?? "", fromPlace: "", toPlace: place, plannedAt: "", carrier: "", driverName: "", driverPhone: "", vehicle: "", cost: "", note: "", items: draft?.items ?? [] }}
      />
    </div>
  );
}
