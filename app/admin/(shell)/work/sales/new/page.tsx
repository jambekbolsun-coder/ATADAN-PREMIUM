import { getRawDb } from "../../../../../../db";
import { getUsdKgsRate } from "../../../../../lib/exchange-rate";
import { requireSection, seesCost } from "../../../../_lib/session";
import { BANKS, catalogModels, METHOD, METHODS, salesPolicy, sellableUnits } from "../../../../_lib/sales";
import { PageHeader } from "../../../../_ui/ui";
import { NewSaleForm } from "./new-sale-form";
import { listParts } from "../../../../_lib/parts";

export const metadata = { title: "Новая продажа" };

export default async function NewSale({ searchParams }: PageProps<"/admin/work/sales/new">) {
  const { actor } = await requireSection("/admin/work/sales");
  const sp = await searchParams;
  const leadId = typeof sp.lead === "string" ? sp.lead : "";
  const [units, models, fx, policy, lead, parts] = await Promise.all([
    sellableUnits(),
    catalogModels(),
    getUsdKgsRate(),
    salesPolicy(),
    leadId ? getRawDb().prepare("SELECT id, name, phone, tractor_slug, sale_id FROM leads WHERE id=?").bind(leadId).first<{ id: string; name: string; phone: string; tractor_slug: string | null; sale_id: string | null }>() : null,
    listParts({}),
  ]);
  const showCost = seesCost(actor);
  return (
    <div style={{ maxWidth: 1180 }}>
      <PageHeader title="Новая продажа" subtitle={lead ? `По заявке: ${lead.name}, ${lead.phone}` : "4 шага: клиент, что покупает, оплата, проверка"} />
      <NewSaleForm
        units={units.map((u) => ({ ...u, cost_minor: showCost ? u.cost_minor : 0 }))}
        models={models}
        parts={parts.filter((p) => p.qty > 0).map((p) => ({ id: p.id, sku: p.sku, name: p.name, qty: p.qty, unit: p.unit, price_minor: p.price_minor, cost_minor: showCost ? p.cost_minor : 0 }))}
        fxDefault={fx?.value ? Math.round(fx.value * 100) / 100 : 87.5}
        fxDate={fx?.date ?? null}
        policy={policy}
        methods={METHODS.map((m) => ({ key: m, ...METHOD[m] }))}
        banks={BANKS}
        showCost={showCost}
        isOwner={actor.role === "owner"}
        lead={lead && !lead.sale_id ? { id: lead.id, name: lead.name, phone: lead.phone, slug: lead.tractor_slug } : null}
      />
    </div>
  );
}
