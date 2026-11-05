import { requireSection } from "../../../_lib/session";
import { listRecords } from "../../../_lib/records-admin";
import { RECORD_KINDS } from "../../../_lib/record-kinds";
import { listModels } from "../../../_lib/catalog-admin";
import { PageHeader } from "../../../_ui/ui";
import { RecordsBoard } from "../records-board";

export const metadata = { title: "Акции" };

export default async function Promotions({ searchParams }: PageProps<"/admin/marketing/promotions">) {
  await requireSection("/admin/marketing/promotions");
  const sp = await searchParams;
  const [records, models] = await Promise.all([listRecords("promotions"), listModels()]);
  return (
    <>
      <PageHeader title="Акции" subtitle="Скидки, сниженный взнос, 0% и подарки на даты. Акция работает только в свой срок, после окончания исчезает с сайта сама." />
      <RecordsBoard kind="promotions" config={RECORD_KINDS.promotions} records={records} models={models.filter((m) => m.status !== "archived").map((m) => ({ slug: m.slug, model: m.model }))} titleLabel="Название акции" subtitleLabel="Короткое описание" initialEdit={typeof sp.edit === "string" ? sp.edit : undefined} />
    </>
  );
}
