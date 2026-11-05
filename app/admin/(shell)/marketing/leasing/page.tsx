import Link from "next/link";
import { requireSection } from "../../../_lib/session";
import { canRecords, listRecords } from "../../../_lib/records-admin";
import { RECORD_KINDS } from "../../../_lib/record-kinds";
import { listModels } from "../../../_lib/catalog-admin";
import { PageHeader } from "../../../_ui/ui";
import { RecordsBoard } from "../records-board";

export const metadata = { title: "Лизинг" };

export default async function Leasing({ searchParams }: PageProps<"/admin/marketing/leasing">) {
  const { actor } = await requireSection("/admin/marketing/leasing");
  const sp = await searchParams;
  const tabs = [
    { key: "programs", label: "Программы банков", kind: "leasing_terms" as const, ok: canRecords(actor, "leasing_terms") },
    { key: "models", label: "Условия по моделям", kind: "leasing_model_terms" as const, ok: canRecords(actor, "leasing_model_terms") },
  ].filter((t) => t.ok);
  const tab = tabs.find((t) => t.key === sp.tab) ?? tabs[0];
  const [records, models] = await Promise.all([listRecords(tab.kind), listModels()]);
  return (
    <>
      <PageHeader title="Лизинг" subtitle="Программы банков и рассрочки для калькулятора на сайте. Срок на сайте всегда 84 месяца." />
      {tabs.length > 1 ? <nav className="ax-tabs" aria-label="Раздел">{tabs.map((t) => <Link key={t.key} href={`/admin/marketing/leasing?tab=${t.key}`} aria-current={t.key === tab.key ? "page" : undefined}>{t.label}</Link>)}</nav> : null}
      <RecordsBoard key={tab.kind} kind={tab.kind} config={RECORD_KINDS[tab.kind]} records={records} models={models.filter((m) => m.status !== "archived").map((m) => ({ slug: m.slug, model: m.model }))} titleLabel={tab.kind === "leasing_terms" ? "Название программы (банк)" : "Название условия"} subtitleLabel="Описание для клиента" />
    </>
  );
}
