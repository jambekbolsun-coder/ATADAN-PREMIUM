import { notFound } from "next/navigation";
import { getUsdKgsRate } from "../../../../../../lib/exchange-rate";
import { requireSection } from "../../../../../_lib/session";
import { canLogistics, listSuppliers } from "../../../../../_lib/stock";
import { catalogModels } from "../../../../../_lib/sales";
import { PageHeader } from "../../../../../_ui/ui";
import { NewOrderForm } from "./new-order-form";

export const metadata = { title: "Новый заказ заводу" };

export default async function NewOrder() {
  const { actor } = await requireSection("/admin/work/logistics");
  if (!canLogistics(actor)) notFound();
  const [suppliers, models, fx] = await Promise.all([listSuppliers(), catalogModels(), getUsdKgsRate()]);
  return (
    <div style={{ maxWidth: 980 }}>
      <PageHeader title="Новый заказ заводу" subtitle="Модели, количество и цена в валюте заказа. VIN укажете позже, в поставке" />
      <NewOrderForm suppliers={suppliers.map((s) => ({ id: s.id, name: s.name }))} models={models.map((m) => ({ slug: m.slug, label: `${m.model} · ${m.hp} л.с.` }))} usdRate={fx?.value ? Math.round(fx.value * 100) / 100 : 87.5} />
    </div>
  );
}
