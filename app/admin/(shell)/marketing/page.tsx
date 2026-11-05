import { notFound } from "next/navigation";
import { requireStaff } from "../../_lib/session";
import { visibleNav } from "../../_lib/nav";
import { Hub } from "../../_ui/hub";

export const metadata = { title: "Маркетинг" };

export default async function MarketingHub() {
  const actor = await requireStaff("/admin/marketing");
  const items = visibleNav(actor).filter((i) => i.space === "marketing");
  if (!items.length) notFound();
  return <Hub title="Маркетинг" subtitle="Всё, что видят клиенты на atadan.kg" items={items} />;
}
