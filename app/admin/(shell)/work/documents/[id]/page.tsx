import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSection } from "../../../../_lib/session";
import { documentLevels, getDocument } from "../../../../_lib/documents-store";
import { archiveDocumentAction } from "../../../../_lib/documents-actions";
import { date, dateTime } from "../../../../_lib/format";
import { ActionButton } from "../../../../_ui/forms";
import { FileLink } from "../../../../_ui/file-upload";
import { Badge, ButtonLink, Card, Notice, PageHeader } from "../../../../_ui/ui";
import { DocForm } from "../doc-form";

export const metadata = { title: "Документ" };

export default async function DocumentCard({ params, searchParams }: PageProps<"/admin/work/documents/[id]">) {
  const { actor } = await requireSection("/admin/work/documents");
  const { id } = await params;
  const sp = await searchParams;
  const d = await getDocument(id);
  if (!d) notFound();
  const { folders, level2, level3 } = await documentLevels([d]);
  const folder = folders.find((f) => f.id === d.folderId);
  const files = [d.fileUrl, ...d.attachments].filter(Boolean);
  const canArchive = actor.role === "owner" || actor.role === "director" || actor.role === "accountant" || d.created_by === actor.id;
  const back = `/admin/work/documents?${new URLSearchParams({ folder: d.folderId, level: d.level2, type: d.level3 }).toString()}`;

  if (sp.edit) {
    return (
      <div style={{ maxWidth: 760 }}>
        <PageHeader title="Изменить документ" actions={<ButtonLink href={`/admin/work/documents/${d.id}`} variant="ghost">Отмена</ButtonLink>} />
        <DocForm docId={d.id} version={d.version} folders={folders} level2={level2} level3={level3} initial={{ title: d.title, date: d.date, folderId: d.folderId, level2: d.level2, level3: d.level3, files, number: d.number, customerId: d.customerId, customerName: d.customer, vin: d.vin, amount: d.amount, note: d.note }} />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 760, display: "grid", gap: 14 }}>
      <PageHeader
        title={<>{d.title} {d.archived ? <Badge tone="mute">в архиве</Badge> : null}</>}
        subtitle={<Link href={back}>{[folder?.name, d.level2, d.level3].filter(Boolean).join(" / ")}</Link>}
        actions={
          <>
            <ButtonLink href={`/admin/work/documents/${d.id}?edit=1`}>Изменить</ButtonLink>
            {canArchive ? (d.archived ? <ActionButton label="Вернуть из архива" action={archiveDocumentAction.bind(null, d.id, false)} /> : <ActionButton variant="danger" label="В архив" confirm="Документ уйдёт в архив. Вернуть можно в любой момент." action={archiveDocumentAction.bind(null, d.id, true)} />) : null}
          </>
        }
      />
      {sp.saved ? <Notice tone="good">Документ сохранён.</Notice> : null}
      <Card title="Файлы">
        <div style={{ display: "grid", gap: 10 }}>{files.map((url, i) => <FileLink key={url} url={url} label={i === 0 ? "Основной файл" : `Файл ${i + 1}`} />)}</div>
      </Card>
      <Card title="Данные">
        <dl className="ax-kv">
          <dt>Дата</dt><dd>{d.date ? date(d.date) : "не указана"}</dd>
          {d.number ? <><dt>Номер</dt><dd>{d.number}</dd></> : null}
          {d.customer ? <><dt>Клиент</dt><dd>{d.customer}</dd></> : null}
          {d.vin ? <><dt>VIN</dt><dd className="num">{d.vin}</dd></> : null}
          {d.amount ? <><dt>Сумма</dt><dd className="num">{Number(d.amount).toLocaleString("ru-RU")} с</dd></> : null}
          {d.note ? <><dt>Комментарий</dt><dd>{d.note}</dd></> : null}
          <dt>Добавлен</dt><dd>{dateTime(d.created_at)}{d.author ? ` · ${d.author}` : ""}</dd>
        </dl>
      </Card>
    </div>
  );
}
