import { requireSection } from "../../../../_lib/session";
import { documentLevels, listDocuments } from "../../../../_lib/documents-store";
import { PageHeader } from "../../../../_ui/ui";
import { DocForm } from "../doc-form";

export const metadata = { title: "Новый документ" };

export default async function NewDocument({ searchParams }: PageProps<"/admin/work/documents/new">) {
  await requireSection("/admin/work/documents");
  const sp = await searchParams;
  const param = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : "");
  const { folders, level2, level3 } = await documentLevels(await listDocuments());
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bishkek" }).format(new Date());
  return (
    <div style={{ maxWidth: 760 }}>
      <PageHeader title="Новый документ" />
      <DocForm
        folders={folders}
        level2={level2}
        level3={level3}
        initial={{ title: "", date: today, folderId: folders.some((f) => f.id === param("folder")) ? param("folder") : folders[0]?.id ?? "", level2: level2.includes(param("level")) ? param("level") : level2[0], level3: level3.includes(param("type")) ? param("type") : level3[0], files: [], number: "", customerId: "", customerName: "", vin: "", amount: "", note: "" }}
      />
    </div>
  );
}
