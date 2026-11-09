import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { requireSection } from "../../../_lib/session";
import { documentLevels, listDocuments, type DocRow } from "../../../_lib/documents-store";
import { addFolderAction, addLevelValueAction, renameFolderAction } from "../../../_lib/documents-actions";
import { date } from "../../../_lib/format";
import { ActionDialog, Field } from "../../../_ui/forms";
import { ButtonLink, Empty, Grouped, PageHeader, RowLink } from "../../../_ui/ui";

export const metadata = { title: "Документы" };

const count = (n: number) => `${n} ${n % 10 === 1 && n % 100 !== 11 ? "документ" : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20) ? "документа" : "документов"}`;
const BASE = "/admin/work/documents";
const url = (p: Record<string, string>) => `${BASE}?${new URLSearchParams(p).toString()}`;

function DocList({ rows }: { rows: DocRow[] }) {
  return (
    <section className="ax-card ax-card-flush">
      <div className="ax-list">
        {rows.map((d) => (
          <Link key={d.id} href={`${BASE}/${d.id}`} className="ax-list-row">
            <span className="ax-row-body">
              <span className="ax-row-t">{d.title}</span>
              <span className="ax-row-s">{[d.date ? date(d.date) : "", d.number ? `№ ${d.number}` : "", d.customer, d.vin, `файлов: ${(d.fileUrl ? 1 : 0) + d.attachments.length}`].filter(Boolean).join(" · ")}</span>
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}

function AddValue({ level, label }: { level: "level2" | "level3"; label: string }) {
  return (
    <ActionDialog label={<><Plus size={16} aria-hidden />{label}</>} title={label} action={addLevelValueAction.bind(null, level)} submitLabel="Добавить">
      <Field label="Название" htmlFor={`add-${level}`}><input id={`add-${level}`} name="value" className="ax-input" required maxLength={60} /></Field>
    </ActionDialog>
  );
}

export default async function Documents({ searchParams }: PageProps<"/admin/work/documents">) {
  await requireSection(BASE);
  const sp = await searchParams;
  const param = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string).trim().slice(0, 80) : "");
  const [folderId, level, type, q, archive] = [param("folder"), param("level"), param("type"), param("q").toLowerCase(), param("archive")];
  const rows = await listDocuments(archive === "1");
  const { folders, level2, level3 } = await documentLevels(rows);
  const folder = folders.find((f) => f.id === folderId);
  const inFolder = folder ? rows.filter((d) => d.folderId === folder.id) : [];
  const inLevel = folder && level ? inFolder.filter((d) => d.level2 === level) : [];
  const shown = folder && level && type ? inLevel.filter((d) => d.level3 === type) : [];
  const found = q ? rows.filter((d) => [d.title, d.number, d.customer, d.vin, d.note, d.level3].join(" ").toLowerCase().includes(q)) : [];
  const newHref = `${BASE}/new?${new URLSearchParams({ ...(folder ? { folder: folder.id } : {}), ...(level ? { level } : {}), ...(type ? { type } : {}) }).toString()}`;

  return (
    <div style={{ maxWidth: 880 }}>
      <PageHeader title={archive === "1" ? "Архив документов" : "Документы"} subtitle="Папка, затем вид добавления, затем тип документа" actions={<ButtonLink href={newHref} variant="primary"><Plus size={17} aria-hidden />Добавить документ</ButtonLink>} />

      <form role="search" style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        {archive === "1" ? <input type="hidden" name="archive" value="1" /> : null}
        <input name="q" defaultValue={param("q")} className="ax-input" placeholder="Название, номер, клиент, VIN" aria-label="Поиск документов" />
        <button className="ax-btn"><Search size={16} aria-hidden />Найти</button>
      </form>

      {folder && !q ? (
        <nav className="ax-small" aria-label="Путь" style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
          <Link href={BASE}>Все папки</Link>
          <span aria-hidden>/</span>
          <Link href={url({ folder: folder.id })}>{folder.name}</Link>
          {level ? <><span aria-hidden>/</span><Link href={url({ folder: folder.id, level })}>{level}</Link></> : null}
          {type ? <><span aria-hidden>/</span><span>{type}</span></> : null}
        </nav>
      ) : null}

      {q ? (
        found.length ? <DocList rows={found} /> : <div className="ax-card"><Empty icon="book" tone="sun" title="Ничего не нашлось" /></div>
      ) : !folder ? (
        <>
          <Grouped title="Папки">
            {folders.map((f) => { const n = rows.filter((d) => d.folderId === f.id).length; return <RowLink key={f.id} href={url({ folder: f.id })} icon="book" tone="sun" label={f.name} hint={count(n)} />; })}
          </Grouped>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
            <ActionDialog label={<><Plus size={16} aria-hidden />Новая папка</>} title="Новая папка" action={addFolderAction} submitLabel="Создать">
              <Field label="Название папки" htmlFor="f-new"><input id="f-new" name="name" className="ax-input" required maxLength={60} /></Field>
            </ActionDialog>
            <ButtonLink href={archive === "1" ? BASE : `${BASE}?archive=1`} variant="ghost">{archive === "1" ? "К документам" : "Архив"}</ButtonLink>
          </div>
        </>
      ) : !level ? (
        <>
          <Grouped title={folder.name}>
            {level2.map((l) => <RowLink key={l} href={url({ folder: folder.id, level: l })} icon="list" tone="sky" label={l} hint={count(inFolder.filter((d) => d.level2 === l).length)} />)}
          </Grouped>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
            <AddValue level="level2" label="Новый вид добавления" />
            <ActionDialog label="Переименовать папку" title="Переименовать папку" action={renameFolderAction.bind(null, folder.id, folder.version)} submitLabel="Сохранить">
              <Field label="Название папки" htmlFor="f-name"><input id="f-name" name="name" className="ax-input" defaultValue={folder.name} required maxLength={60} /></Field>
            </ActionDialog>
          </div>
        </>
      ) : !type ? (
        <>
          <Grouped title={level}>
            {level3.map((t) => <RowLink key={t} href={url({ folder: folder.id, level, type: t })} icon="receipt" tone="green" label={t} hint={count(inLevel.filter((d) => d.level3 === t).length)} />)}
          </Grouped>
          <div style={{ marginTop: 12 }}><AddValue level="level3" label="Новый тип документа" /></div>
        </>
      ) : shown.length ? <DocList rows={shown} /> : <div className="ax-card"><Empty icon="book" tone="sun" title="Здесь пока нет документов" action={<ButtonLink href={newHref} variant="primary" size="sm">Добавить документ</ButtonLink>} /></div>}
    </div>
  );
}
