import Link from "next/link";
import { notFound } from "next/navigation";
import { getRawDb } from "../../../../../../db";
import { requireSection } from "../../../../_lib/session";
import { getTicket, SERVICE_KIND, SERVICE_STATUS } from "../../../../_lib/service";
import { updateTicketAction } from "../../../../_lib/ops-actions";
import { date, dateTime, money } from "../../../../_lib/format";
import { ActionDialog, Field } from "../../../../_ui/forms";
import { Badge, Card, Notice, PageHeader } from "../../../../_ui/ui";

export const metadata = { title: "Обращение" };

export default async function Ticket({ params }: PageProps<"/admin/work/service/[id]">) {
  await requireSection("/admin/work/service");
  const { id } = await params;
  const data = await getTicket(id);
  if (!data) notFound();
  const { ticket: t, events, warranty: w } = data;
  const staff = (await getRawDb().prepare("SELECT id, display_name AS name FROM staff WHERE active=1 ORDER BY display_name").all<{ id: string; name: string }>()).results;
  const st = SERVICE_STATUS[t.status];
  const next: Record<string, string[]> = { new: ["diagnosis", "in_work", "rejected"], diagnosis: ["waiting_parts", "in_work", "rejected"], waiting_parts: ["in_work"], in_work: ["waiting_parts", "done"], done: ["closed", "in_work"], closed: ["in_work"], rejected: ["new"] };

  return (
    <>
      <PageHeader
        title={<><span className="num">{t.number}</span> <Badge tone={st?.tone}>{st?.label}</Badge></>}
        subtitle={<>{SERVICE_KIND[t.kind]} · открыто {dateTime(String(t.opened_at))}{t.assignee ? ` · ответственный ${t.assignee}` : ""}</>}
        actions={
          <ActionDialog label="Изменить статус" triggerClass="ax-btn-primary" title={`Обращение ${t.number}`} action={updateTicketAction.bind(null, t.id)} submitLabel="Сохранить">
            <div className="ax-grid ax-g2" style={{ gap: 12 }}>
              <Field label="Статус" htmlFor="tk-st"><select id="tk-st" name="status" className="ax-input" defaultValue={next[t.status]?.[0] ?? t.status}>{Object.entries(SERVICE_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select></Field>
              <Field label="Ответственный" htmlFor="tk-a"><select id="tk-a" name="assignedTo" className="ax-input" defaultValue={t.assigned_to ?? ""}>{staff.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></Field>
              <Field label="Срок" htmlFor="tk-due"><input id="tk-due" name="dueAt" type="date" className="ax-input" defaultValue={String(t.due_at ?? "")} /></Field>
              {t.kind !== "warranty" ? <Field label="Стоимость работ, сом" htmlFor="tk-price"><input id="tk-price" name="price" className="ax-input num" inputMode="decimal" defaultValue={t.price_minor ? String(t.price_minor / 100) : ""} /></Field> : null}
            </div>
            <Field label="Что сделано" htmlFor="tk-res" hint="Обязательно для «Готово» и «Закрыто»"><textarea id="tk-res" name="resolution" className="ax-input" rows={3} defaultValue={t.resolution} /></Field>
            <Field label="Комментарий в историю" htmlFor="tk-note"><input id="tk-note" name="note" className="ax-input" placeholder="Заказали сальник, ждём 5 дней" /></Field>
          </ActionDialog>
        }
      />
      {t.kind === "warranty" && !w.active ? <div style={{ marginBottom: 12 }}><Notice tone="warn">Гарантия по этой машине {w.until ? `закончилась ${date(w.until)}` : "ещё не началась (машина не выдана)"}. Обращение принято с согласования руководства.</Notice></div> : null}
      <div className="ax-grid ax-g-main">
        <div className="ax-grid" style={{ alignContent: "start" }}>
          <Card title="Неисправность">
            <p style={{ marginTop: 0, whiteSpace: "pre-wrap" }}>{t.issue}</p>
            {t.engine_hours ? <p className="ax-small" style={{ margin: 0 }}>Моточасы при обращении: {t.engine_hours}</p> : null}
          </Card>
          {t.resolution ? <Card title="Что сделано"><p style={{ margin: 0, whiteSpace: "pre-wrap" }}>{t.resolution}</p>{t.price_minor ? <p className="ax-small">Стоимость: {money(t.price_minor)}</p> : null}</Card> : null}
          <Card title="История">
            <div className="ax-list">
              {events.map((e, i) => <div key={i} className="ax-list-row"><span className="ax-row-body"><span className="ax-row-t">{e.note}</span><span className="ax-row-s">{dateTime(e.created_at)}{e.author ? ` · ${e.author}` : ""}</span></span></div>)}
            </div>
          </Card>
        </div>
        <div className="ax-grid" style={{ alignContent: "start" }}>
          <Card title="Машина и клиент">
            <dl className="ax-kv">
              <dt>Модель</dt><dd>{String(t.model ?? "")}</dd>
              <dt>VIN</dt><dd className="num">{t.unit_id ? <Link href={`/admin/work/stock/${t.unit_id}`} style={{ color: "var(--brand)" }}>{String(t.vin)}</Link> : "нет"}</dd>
              {t.engine_number ? <><dt>Двигатель</dt><dd className="num">{String(t.engine_number)}</dd></> : null}
              <dt>Клиент</dt><dd>{t.customer_id ? <Link href={`/admin/work/clients/${t.customer_id}`} style={{ color: "var(--brand)" }}>{String(t.customer)}</Link> : "нет"}{t.phone ? <div className="ax-small num">{String(t.phone)}</div> : null}</dd>
              <dt>Продажа</dt><dd>{t.sale_id ? <Link href={`/admin/work/sales/${t.sale_id}`} style={{ color: "var(--brand)" }}>{String(t.sale_number)}</Link> : "нет"}</dd>
              <dt>Гарантия</dt><dd>{w.until ? <>{w.active ? "до" : "закончилась"} {date(w.until)}{w.hours ? <div className="ax-small">или {w.hours} моточасов</div> : null}</> : "не выдана"}</dd>
            </dl>
          </Card>
          <Card title="Запчасти" more={{ href: "/admin/work/parts", label: "Склад" }}>
            <p className="ax-small" style={{ margin: 0 }}>Для ремонта спишите запчасти в карточке запчасти (движение «Списание» с номером обращения {t.number}) или продайте их клиенту через «Продажи».</p>
          </Card>
        </div>
      </div>
    </>
  );
}
