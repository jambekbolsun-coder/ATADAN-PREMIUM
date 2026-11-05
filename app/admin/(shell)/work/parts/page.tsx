import { requireSection } from "../../../_lib/session";
import { PartsList } from "./parts-list";

export const metadata = { title: "Запчасти" };

export default async function Parts({ searchParams }: PageProps<"/admin/work/parts">) {
  const { actor } = await requireSection("/admin/work/parts");
  return <PartsList actor={actor} base="/admin/work/parts" sp={await searchParams} mode="stock" />;
}
