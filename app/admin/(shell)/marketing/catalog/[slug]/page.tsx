import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { requireSection } from "../../../../_lib/session";
import { CATEGORIES, getModel, MODEL_STATUS } from "../../../../_lib/catalog-admin";
import { isBoss } from "../../../../_lib/db-kit";
import { modelCostAction, modelStatusAction } from "../../../../_lib/marketing-actions";
import { date, money } from "../../../../_lib/format";
import { ActionButton, ActionDialog, Field } from "../../../../_ui/forms";
import { Badge, Card, Notice, PageHeader } from "../../../../_ui/ui";
import { ModelForm } from "../model-form";

export const metadata = { title: "Модель" };
const som = (n: number | null | undefined) => (n ? `${Number(n).toLocaleString("ru-RU")} с` : "по запросу");

export default async function ModelCard({ params, searchParams }: PageProps<"/admin/marketing/catalog/[slug]">) {
  const { actor } = await requireSection("/admin/marketing/catalog");
  const { slug } = await params;
  const sp = await searchParams;
  const data = await getModel(slug);
  if (!data) notFound();
  const { model: m, history, promotions } = data;
  const st = MODEL_STATUS[m.status];
  const hideWarn = m.stock + m.reserved > 0 ? `На складе ${m.stock}${m.reserved ? `, в резерве ${m.reserved}` : ""}. Модель пропадёт с сайта, но останется в продажах и на складе.` : undefined;

  return (
    <>
      <PageHeader
        title={<>{m.model} <Badge tone={st.tone}>{st.label}</Badge></>}
        subtitle={<>{m.hp} л.с. · {m.category} · {m.status === "published" ? <a href={`/catalog/${m.slug}`} target="_blank" rel="noreferrer" style={{ color: "var(--brand)" }}>открыть на сайте <ExternalLink size={13} aria-hidden /></a> : "на сайте не видна"}</>}
        actions={
          <>
            {m.status !== "published" ? <ActionButton variant="primary" label="Показать на сайте" action={modelStatusAction.bind(null, m.slug, "published")} disabled={!m.image} disabledReason="Добавьте главное фото" /> : null}
            {m.status === "published" ? <ActionButton label="Скрыть с сайта" action={modelStatusAction.bind(null, m.slug, "hidden")} confirm={hideWarn ?? "Модель пропадёт с сайта. Вернуть можно в любой момент."} /> : null}
            {m.status !== "archived" ? <ActionButton variant="danger" label="В архив" action={modelStatusAction.bind(null, m.slug, "archived")} confirm={`Модель уйдёт в архив и пропадёт с сайта. ${hideWarn ?? ""}`} /> : <ActionButton label="Вернуть из архива" action={modelStatusAction.bind(null, m.slug, "draft")} />}
          </>
        }
      />
      {sp.saved ? <div style={{ marginBottom: 12 }}><Notice tone="good">Модель сохранена.</Notice></div> : null}
      <div className="ax-grid ax-g-main">
        <ModelForm
          originalSlug={m.slug}
          slugLocked={!m.custom}
          categories={CATEGORIES.includes(m.category) ? CATEGORIES : [m.category, ...CATEGORIES]}
          initial={{
            slug: m.slug, model: m.model, hp: String(m.hp), category: m.category, farmArea: m.farmArea ?? "", price: m.price ? String(m.price) : "", priceUsd: m.approximatePriceUsd ? String(m.approximatePriceUsd) : "",
            discountPercent: m.discountPercent ? String(m.discountPercent) : "", promotionLabel: m.promotionLabel ?? "", recommended: !!m.recommended, popular: !!m.popular, sortOrder: String(m.sortOrder ?? 0),
            image: m.image ?? "", images: (m.images ?? []).filter((x) => x !== m.image), videoUrl: m.videoUrl ?? "", description: m.description ?? "", comfort: m.comfort ?? "", equipment: (m.equipment ?? []).join("\n"),
            specs: Object.entries(m.specs ?? {}).map(([k, v]) => ({ k, v: String(v) })), status: m.status,
          }}
        />
        <div className="ax-grid" style={{ alignContent: "start" }}>
          <Card title="Наличие" more={{ href: `/admin/work/stock?q=${encodeURIComponent(m.model)}`, label: "Склад" }}>
            <dl className="ax-kv">
              <dt>На складе</dt><dd className="num">{m.stock}</dd>
              <dt>В пути</dt><dd className="num">{m.transit}</dd>
              <dt>В резерве</dt><dd className="num">{m.reserved}</dd>
              <dt>Продано</dt><dd className="num">{m.sold}</dd>
            </dl>
            <p className="ax-small" style={{ marginBottom: 0 }}>На сайте: {m.stock ? `«В наличии ${m.stock}»` : m.transit ? "«В пути»" : "«Под заказ»"}. Считается само.</p>
          </Card>
          {isBoss(actor) ? (
            <Card title="Себестоимость модели">
              <p className="ax-small" style={{ marginTop: 0 }}>Нужна для заказа под клиента, пока машины нет на складе. У машин на складе своя себестоимость из поставки.</p>
              <div className="ax-row-line" style={{ marginBottom: 8 }}><span className="ax-small">Сейчас</span><b className="num">{m.cost_minor !== null ? money(m.cost_minor) : "не задана"}</b></div>
              <ActionDialog label="Изменить" triggerClass="ax-btn-sm" title="Себестоимость модели" action={modelCostAction.bind(null, m.slug, m.cost_version)} submitLabel="Сохранить">
                <Field label="Себестоимость, сом" htmlFor="m-cost"><input id="m-cost" name="cost" className="ax-input num" inputMode="decimal" defaultValue={m.cost_minor !== null ? String(m.cost_minor / 100) : ""} required /></Field>
              </ActionDialog>
            </Card>
          ) : null}
          <Card title="История цены">
            {history.length ? (
              <div className="ax-list">
                {history.map((h, i) => (
                  <div key={i} className="ax-list-row">
                    <span className="ax-row-body">
                      <span className="ax-row-t num">{som(h.old_price)} → {som(h.new_price)}</span>
                      <span className="ax-row-s">{date(h.changed_at)}{h.author ? ` · ${h.author}` : ""}{h.old_usd !== h.new_usd ? ` · $${h.old_usd ?? "?"} → $${h.new_usd ?? "?"}` : ""}{h.note ? ` · ${h.note}` : ""}</span>
                    </span>
                  </div>
                ))}
              </div>
            ) : <p className="ax-small" style={{ margin: 0 }}>Цена ещё не менялась в новой админке.</p>}
          </Card>
          <Card title="Акции" more={{ href: "/admin/marketing/promotions", label: "Все акции" }}>
            {promotions.length ? promotions.map((p) => <div key={p.id} className="ax-row-line"><Link href={`/admin/marketing/promotions?edit=${p.id}`}>{p.title}</Link><span className="ax-small">{p.startsAt ? date(p.startsAt) : ""}{p.endsAt ? ` - ${date(p.endsAt)}` : ""}</span></div>) : <p className="ax-small" style={{ margin: 0 }}>Акций на модель нет.</p>}
          </Card>
        </div>
      </div>
    </>
  );
}
