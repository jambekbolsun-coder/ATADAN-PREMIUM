import { notFound } from "next/navigation";
import { requireStaff } from "../../../../_lib/session";
import { canPartsCard, canPartsStock, getPart, MOVE_KIND, PART_CATEGORIES, seesPartCost } from "../../../../_lib/parts";
import { listModels } from "../../../../_lib/catalog-admin";
import { partArchiveAction, partMovementAction } from "../../../../_lib/marketing-actions";
import { dateTime, money } from "../../../../_lib/format";
import { ActionButton, ActionDialog, Field } from "../../../../_ui/forms";
import { Badge, Card, Notice, PageHeader } from "../../../../_ui/ui";
import { PartForm } from "../part-form";

export const metadata = { title: "Запчасть" };

export default async function PartCard({ params, searchParams }: PageProps<"/admin/work/parts/[id]">) {
  const actor = await requireStaff("/admin/work/parts");
  if (!canPartsCard(actor)) notFound();
  const { id } = await params;
  const sp = await searchParams;
  const data = await getPart(id);
  if (!data) notFound();
  const { part: p, movements } = data;
  const models = (await listModels()).filter((m) => m.status !== "archived").map((m) => ({ slug: m.slug, model: m.model }));
  const cost = seesPartCost(actor), stock = canPartsStock(actor);
  const low = p.min_qty > 0 && p.qty <= p.min_qty;

  return (
    <>
      <PageHeader
        title={<>{p.name} {p.archived ? <Badge tone="mute">в архиве</Badge> : low ? <Badge tone="warn">пора заказать</Badge> : null}</>}
        subtitle={<span className="num">{p.sku} · остаток {p.qty} {p.unit}{p.location ? ` · ${p.location}` : ""}</span>}
        actions={
          <>
            {stock && !p.archived ? (
              <ActionDialog label="Движение" triggerClass="ax-btn-primary" title={`Движение: ${p.sku}`} description={`Сейчас на складе ${p.qty} ${p.unit}. Остаток не может стать меньше нуля.`} action={partMovementAction.bind(null, p.id)} submitLabel="Провести">
                <Field label="Что произошло" htmlFor="mv-kind"><select id="mv-kind" name="kind" className="ax-input">{Object.entries(MOVE_KIND).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select></Field>
                <Field label="Количество (для инвентаризации: сколько есть по факту)" htmlFor="mv-qty"><input id="mv-qty" name="qty" className="ax-input num" inputMode="numeric" required /></Field>
                {cost ? <Field label="Цена закупки за штуку, сом (для прихода)" htmlFor="mv-cost" hint="Себестоимость пересчитается по средней"><input id="mv-cost" name="unitCost" className="ax-input num" inputMode="decimal" /></Field> : null}
                <Field label="Комментарий" htmlFor="mv-note" hint="Для списания и инвентаризации обязательно"><input id="mv-note" name="note" className="ax-input" placeholder="Поставка от 05.11 / брак / продажа клиенту" /></Field>
              </ActionDialog>
            ) : null}
            {p.archived ? <ActionButton label="Вернуть из архива" action={partArchiveAction.bind(null, p.id, false)} /> : <ActionButton variant="danger" label="В архив" action={partArchiveAction.bind(null, p.id, true)} confirm="Запчасть пропадёт из списков и с сайта. Остаток должен быть 0." disabled={p.qty > 0} disabledReason="Сначала спишите остаток" />}
          </>
        }
      />
      {sp.saved ? <div style={{ marginBottom: 12 }}><Notice tone="good">Запчасть добавлена.</Notice></div> : null}
      <div className="ax-grid ax-g-main">
        <PartForm categories={PART_CATEGORIES.includes(p.category) ? PART_CATEGORIES : [p.category, ...PART_CATEGORIES]} models={models} seesCost={cost} canStock={stock}
          initial={{ id: p.id, sku: p.sku, name: p.name, category: p.category, models: p.models, unit: p.unit, price: p.price_minor ? String(p.price_minor / 100) : "", cost: p.cost_minor ? String(p.cost_minor / 100) : "", minQty: String(p.min_qty), location: p.location, image: p.image, description: p.description, showOnSite: !!p.show_on_site, openingQty: "" }} />
        <div className="ax-grid" style={{ alignContent: "start" }}>
          <Card title="Остаток">
            <dl className="ax-kv">
              <dt>На складе</dt><dd className="num ax-strong">{p.qty} {p.unit}</dd>
              <dt>Минимум</dt><dd className="num">{p.min_qty || "не задан"}</dd>
              <dt>Цена продажи</dt><dd className="num">{money(p.price_minor)}</dd>
              {cost ? <><dt>Себестоимость</dt><dd className="num">{money(p.cost_minor)}</dd><dt>Наценка</dt><dd className="num">{p.cost_minor ? `${Math.round(((p.price_minor - p.cost_minor) / p.cost_minor) * 100)}%` : "нет"}</dd></> : null}
            </dl>
          </Card>
          <Card title="Движения">
            {movements.length ? (
              <div className="ax-list">
                {movements.map((m) => (
                  <div key={m.id} className="ax-list-row">
                    <span className="ax-row-body">
                      <span className="ax-row-t"><Badge tone={MOVE_KIND[m.kind]?.tone ?? "mute"}>{MOVE_KIND[m.kind]?.label ?? m.kind}</Badge> <span className="num">{m.qty_delta > 0 ? "+" : ""}{m.qty_delta}</span> <span className="ax-small">→ {m.qty_after}</span></span>
                      <span className="ax-row-s">{dateTime(m.created_at)}{m.author ? ` · ${m.author}` : ""}{m.sale_number ? ` · ${m.sale_number}` : ""}{m.note ? ` · ${m.note}` : ""}{cost && m.kind === "in" ? ` · по ${money(m.unit_cost_minor)}` : ""}</span>
                    </span>
                  </div>
                ))}
              </div>
            ) : <p className="ax-small" style={{ margin: 0 }}>Движений ещё не было.</p>}
          </Card>
        </div>
      </div>
    </>
  );
}
