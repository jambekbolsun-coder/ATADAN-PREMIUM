import { getUsdKgsRate } from "../../../../../lib/exchange-rate";
import { requireSection, seesCost } from "../../../../_lib/session";
import { moneyAccounts, sellableUnits } from "../../../../_lib/sales";
import { ButtonLink, Empty, PageHeader } from "../../../../_ui/ui";
import { QuickSaleForm } from "./quick-sale-form";

export const metadata = { title: "Быстрая продажа" };

export default async function QuickSale() {
  const { actor } = await requireSection("/admin/work/sales");
  const [units, accounts, fx] = await Promise.all([sellableUnits(), moneyAccounts(), getUsdKgsRate()]);
  const stock = units.filter((u) => u.status === "stock");
  const showCost = seesCost(actor);
  return (
    <div style={{ maxWidth: 760 }}>
      <PageHeader title="Быстрая продажа" subtitle="Машина со склада: клиент, цена и оплата на одном экране" actions={<ButtonLink href="/admin/work/sales/new">Полное оформление</ButtonLink>} />
      {stock.length ? (
        <QuickSaleForm
          units={stock.map((u) => ({ id: u.id, vin: u.vin, model: u.model, list_price_minor: u.list_price_minor, cost_minor: showCost ? u.cost_minor : 0 }))}
          accounts={accounts.filter((a) => a.currency === "KGS" || a.currency === "USD").map((a) => ({ id: a.id, name: a.name, currency: a.currency }))}
          fxDefault={fx?.value ? Math.round(fx.value * 100) / 100 : 87.5}
          isOwner={actor.role === "owner"}
        />
      ) : <div className="ax-card"><Empty icon="tractor" title="На складе нет свободных машин" text="Продажа под заказ и лизинг оформляются в полном оформлении." action={<ButtonLink href="/admin/work/sales/new" variant="primary">Полное оформление</ButtonLink>} /></div>}
    </div>
  );
}
