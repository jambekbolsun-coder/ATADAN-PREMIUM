import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSection } from "../../../_lib/session";
import { canRecords, listRecords } from "../../../_lib/records-admin";
import { RECORD_KINDS } from "../../../_lib/record-kinds";
import { canBanks, canSite, getLeaseTermSettings, getSiteSettings, listBanks } from "../../../_lib/site-admin";
import { listModels } from "../../../_lib/catalog-admin";
import { PageHeader } from "../../../_ui/ui";
import { RecordsBoard } from "../records-board";
import { SiteForm } from "./site-form";
import { BanksSection } from "./banks";

export const metadata = { title: "Страницы сайта" };

export default async function Pages({ searchParams }: PageProps<"/admin/marketing/pages">) {
  const { actor } = await requireSection("/admin/marketing/pages");
  const sp = await searchParams;
  const tabs = [
    { key: "contacts", label: "Контакты и калькулятор", ok: true },
    { key: "banks", label: "Банки и ставки", ok: canBanks(actor) },
    { key: "faq", label: "Частые вопросы", ok: canRecords(actor, "faq") },
    { key: "service", label: "Сервис", ok: canRecords(actor, "service_pages") },
  ].filter((t) => t.ok);
  const tab = tabs.find((t) => t.key === sp.tab) ?? tabs[0];
  if (!tab) notFound();
  const header = <PageHeader title="Страницы сайта" subtitle="Контакты, банки и ставки калькулятора, частые вопросы помощника и страницы сервиса на atadan.kg" />;
  const nav = <nav className="ax-tabs" aria-label="Раздел">{tabs.map((t) => <Link key={t.key} href={`/admin/marketing/pages?tab=${t.key}`} aria-current={t.key === tab.key ? "page" : undefined}>{t.label}</Link>)}</nav>;

  if (tab.key === "contacts") {
    const { settings, version } = await getSiteSettings();
    return <>{header}{nav}<div style={{ maxWidth: 820 }}><SiteForm settings={settings} version={version} canEdit={canSite(actor)} /></div></>;
  }
  if (tab.key === "banks") {
    const [banks, term] = await Promise.all([listBanks(), getLeaseTermSettings()]);
    return <>{header}{nav}<BanksSection banks={banks} maxMonths={term.maxMonths} termVersion={term.version} canEdit={canBanks(actor)} /></>;
  }
  const kind = tab.key === "faq" ? "faq" : "service_pages";
  const [records, models] = await Promise.all([listRecords(kind), listModels()]);
  return (
    <>
      {header}{nav}
      <RecordsBoard key={kind} kind={kind} config={RECORD_KINDS[kind]} records={records} models={models.map((m) => ({ slug: m.slug, model: m.model }))} titleLabel={kind === "faq" ? "Вопрос" : "Заголовок страницы"} subtitleLabel={kind === "service_pages" ? "Короткое описание" : undefined} />
    </>
  );
}
