import { requireSection } from "../../../_lib/session";
import { PartsList } from "../../work/parts/parts-list";

export const metadata = { title: "Каталог запчастей" };

export default async function PartsCatalog({ searchParams }: PageProps<"/admin/marketing/parts">) {
  const { actor } = await requireSection("/admin/marketing/parts");
  return <PartsList actor={actor} base="/admin/marketing/parts" sp={await searchParams} mode="site" />;
}
