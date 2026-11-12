import Link from "next/link";
import { requireSection } from "../../../_lib/session";
import { canRecords, listRecords } from "../../../_lib/records-admin";
import { RECORD_KINDS, type RecordKindConfig } from "../../../_lib/record-kinds";
import { listModels } from "../../../_lib/catalog-admin";
import { getLeaseTermSettings } from "../../../_lib/site-admin";
import { formatLeaseTerm } from "../../../../lib/leasing";
import { Notice, PageHeader } from "../../../_ui/ui";
import { RecordsBoard } from "../records-board";

export const metadata = { title: "Лизинг" };

/**
 * Срок на сайте выбирает клиент (от 1 месяца до максимума из «Страницы сайта → Банки и ставки»),
 * поэтому поле «Доступные сроки» здесь только для справки. Подсказки меняем на этой странице,
 * хранение и проверки остаются общими (record-kinds.ts).
 */
function withTermHint(config: RecordKindConfig, maxMonths: number): RecordKindConfig {
  const hint = `Для справки. На сайте клиент сам выбирает срок от 1 месяца до ${formatLeaseTerm(maxMonths)}; максимум меняется в «Страницы сайта → Банки и ставки»`;
  return { ...config, fields: config.fields.map((f) => (f.key === "termsMonths" ? { ...f, label: "Сроки для справки: через запятую", hint } : f)) };
}

export default async function Leasing({ searchParams }: PageProps<"/admin/marketing/leasing">) {
  const { actor } = await requireSection("/admin/marketing/leasing");
  const sp = await searchParams;
  const tabs = [
    { key: "programs", label: "Программы банков", kind: "leasing_terms" as const, ok: canRecords(actor, "leasing_terms") },
    { key: "models", label: "Условия по моделям", kind: "leasing_model_terms" as const, ok: canRecords(actor, "leasing_model_terms") },
  ].filter((t) => t.ok);
  const tab = tabs.find((t) => t.key === sp.tab) ?? tabs[0];
  const [records, models, term] = await Promise.all([listRecords(tab.kind), listModels(), getLeaseTermSettings()]);
  const edit = typeof sp.edit === "string" ? sp.edit : undefined;
  return (
    <>
      <PageHeader title="Лизинг" subtitle={`Подробные условия программ банков и рассрочки для калькулятора на сайте. Срок клиент выбирает сам: от 1 месяца до ${formatLeaseTerm(term.maxMonths)}.`} />
      {tabs.length > 1 ? <nav className="ax-tabs" aria-label="Раздел">{tabs.map((t) => <Link key={t.key} href={`/admin/marketing/leasing?tab=${t.key}`} aria-current={t.key === tab.key ? "page" : undefined}>{t.label}</Link>)}</nav> : null}
      {tab.kind === "leasing_terms" ? (
        <div style={{ marginBottom: 12 }}>
          <Notice>
            Название банка, ставку, минимальный взнос, комиссию, включение и максимальный срок проще менять в <Link href="/admin/marketing/pages?tab=banks">Страницы сайта → Банки и ставки</Link>. Это те же записи: изменения видны в обоих местах. Программа видна в калькуляторе, когда у неё статус «На сайте».
          </Notice>
        </div>
      ) : null}
      <RecordsBoard key={tab.kind} kind={tab.kind} config={withTermHint(RECORD_KINDS[tab.kind], term.maxMonths)} records={records} models={models.filter((m) => m.status !== "archived").map((m) => ({ slug: m.slug, model: m.model }))} titleLabel={tab.kind === "leasing_terms" ? "Название программы (банк)" : "Название условия"} subtitleLabel="Описание для клиента" initialEdit={edit} />
    </>
  );
}
