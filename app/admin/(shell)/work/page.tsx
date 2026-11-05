import { notFound } from "next/navigation";
import { requireStaff } from "../../_lib/session";
import { visibleNav } from "../../_lib/nav";
import { Hub } from "../../_ui/hub";

export const metadata = { title: "Работа" };

export default async function WorkHub() {
  const actor = await requireStaff("/admin/work");
  const items = visibleNav(actor).filter((i) => i.space === "work");
  if (!items.length) notFound();
  return <Hub title="Работа" subtitle="Продажи, склад, логистика и деньги компании" items={items} />;
}
