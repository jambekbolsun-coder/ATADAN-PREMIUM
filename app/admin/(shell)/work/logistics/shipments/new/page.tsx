import { notFound } from "next/navigation";
import { requireSection } from "../../../../../_lib/session";
import { canLogistics, getOrder } from "../../../../../_lib/stock";
import { PageHeader } from "../../../../../_ui/ui";
import { NewShipmentForm } from "./new-shipment-form";

export const metadata = { title: "Новая поставка" };

export default async function NewShipment({ searchParams }: PageProps<"/admin/work/logistics/shipments/new">) {
  const { actor } = await requireSection("/admin/work/logistics");
  if (!canLogistics(actor)) notFound();
  const sp = await searchParams;
  const data = typeof sp.po === "string" ? await getOrder(sp.po) : null;
  if (!data) notFound();
  const lines = data.lines.filter((l) => l.shipped < l.qty).map((l) => ({ id: l.id, model: l.model, left: l.qty - l.shipped }));
  return (
    <div style={{ maxWidth: 1080 }}>
      <PageHeader title="Новая поставка" subtitle={`Заказ ${data.order.order_number} · ${data.order.supplier}. Внесите машины из упаковочного листа: модель и VIN`} />
      <NewShipmentForm poId={data.order.id} lines={lines} />
    </div>
  );
}
