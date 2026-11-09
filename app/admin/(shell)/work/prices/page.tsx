import { notFound } from "next/navigation";
import { requireStaff } from "../../../_lib/session";
import { canCatalog, canModelCost, listModels } from "../../../_lib/catalog-admin";
import { suggestedPriceUsd } from "../../../../lib/catalog";
import { Notice, PageHeader } from "../../../_ui/ui";
import { PriceTable } from "./price-table";

export const metadata = { title: "Прайс и себестоимость" };

export default async function Prices() {
  const actor = await requireStaff("/admin/work/prices");
  const canPrice = canCatalog(actor), canCost = canModelCost(actor);
  if (!canPrice && !canCost) notFound();
  const models = (await listModels()).filter((m) => m.status !== "archived");
  return (
    <>
      <PageHeader title="Прайс и себестоимость" subtitle="Все модели в одной таблице: меняете нужные ячейки и сохраняете. Цена сразу идёт на сайт и в новые продажи." />
      <div style={{ marginBottom: 12 }}><Notice tone="info">Уже оформленные продажи не меняются. Своя цена или себестоимость конкретной машины, если она задана в её карточке, важнее значения из этой таблицы.</Notice></div>
      <PriceTable
        canPrice={canPrice}
        canCost={canCost}
        rows={models.map((m) => ({
          slug: m.slug, model: m.model, hp: m.hp, price: m.price ? String(m.price) : "", usd: m.usd_manual ? String(m.usd_manual) : "", usdHint: suggestedPriceUsd(m.hp),
          discount: m.discountPercent ? String(m.discountPercent) : "", cost: canCost && m.cost_minor !== null ? String(Math.round(m.cost_minor / 100)) : "", onRequest: !!m.priceOnRequest, stock: m.stock, status: m.status,
        }))}
      />
    </>
  );
}
