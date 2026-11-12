import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSection } from "../../../_lib/session";
import { catalogModels } from "../../../_lib/sales";
import { canQuickLeads, QUICK_SOURCES, recentQuick, sellers } from "../../../_lib/quick-leads";
import { sourceLabel } from "../../../_lib/dashboard";
import { dateTime } from "../../../_lib/format";
import { Badge, Card, PageHeader } from "../../../_ui/ui";
import { QuickLeadsForm } from "./quick-leads-form";

export const metadata = { title: "Быстрые заявки" };
const STATUS: Record<string, { label: string; tone: "warn" | "info" | "mute" }> = { new: { label: "новая", tone: "warn" }, contacted: { label: "в работе", tone: "info" }, closed: { label: "закрыта", tone: "mute" } };

export default async function QuickLeads() {
  const { actor } = await requireSection("/admin/work/quick-leads");
  if (!canQuickLeads(actor)) notFound();
  const [models, team, recent] = await Promise.all([catalogModels(), sellers(), recentQuick(actor)]);

  return (
    <>
      <PageHeader title="Быстрые заявки" subtitle="Вставьте текст из чат-бота, WhatsApp или Instagram: имя, телефон, модель и встреча разложатся сами" />
      <div className="ax-grid ax-g-main">
        <QuickLeadsForm models={models.map((m) => ({ slug: m.slug, model: m.model, label: `${m.model} · ${m.hp} л.с.` }))} sellers={team} sources={QUICK_SOURCES} me={actor.id} />
        <div className="ax-grid" style={{ alignContent: "start" }}>
          <Card title="Как это работает">
            <ol className="ax-guide-steps" style={{ fontSize: 14 }}>
              <li>Скопируйте анкету из чат-бота или сообщение клиента и вставьте сюда.</li>
              <li>Нажмите «Разобрать». Каждый клиент станет отдельной карточкой.</li>
              <li>Проверьте имя, телефон и модель. Если номер уже есть в базе, будет предупреждение.</li>
              <li>Выберите, кому отдать, и нажмите «Отправить в заявки».</li>
            </ol>
            <p className="ax-small" style={{ margin: "10px 0 0" }}>Задача клиента, оплата, заметки и ссылка на КП попадают в комментарий заявки. Встреча видна в списке заявок.</p>
          </Card>
          <Card title="Добавлено недавно" more={{ href: "/admin/work/leads", label: "Все заявки" }}>
            {recent.length ? (
              <div className="ax-list">
                {recent.map((l) => (
                  <Link key={l.id} href={`/admin/work/leads?view=${l.status === "new" ? "new" : l.status === "closed" ? "closed" : "work"}`} className="ax-list-row">
                    <span className="ax-row-body">
                      <span className="ax-row-t">{l.name}</span>
                      <span className="ax-row-s">{sourceLabel(l.source)}{l.tractor_model ? ` · ${l.tractor_model}` : ""} · {dateTime(l.created_at)}{l.who ? ` · ${l.who}` : ""}</span>
                    </span>
                    <Badge tone={STATUS[l.status]?.tone ?? "mute"}>{STATUS[l.status]?.label ?? l.status}</Badge>
                  </Link>
                ))}
              </div>
            ) : <p className="ax-small" style={{ margin: 0 }}>Здесь появятся заявки, добавленные через быстрый ввод.</p>}
          </Card>
        </div>
      </div>
    </>
  );
}
