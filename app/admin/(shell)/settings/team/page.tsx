import { requireSection } from "../../../_lib/session";
import { ALL_ROLES, canTeam, DEFAULT_PERMS, listTeam, PERM_GROUPS, STAFF_ROLES } from "../../../_lib/team";
import { blockAction, positionAction, revokeInviteAction, roleAction, unblockAction } from "../../../_lib/settings-actions";
import { ROLE_LABEL, staffTitle } from "../../../_lib/roles";
import { ago, dateTime } from "../../../_lib/format";
import { ActionButton, ActionDialog, Field } from "../../../_ui/forms";
import { Avatar, Badge, Card, Notice, PageHeader } from "../../../_ui/ui";
import { InvitePanel, PermEditor, ResetLink } from "./team-client";

export const metadata = { title: "Сотрудники" };

export default async function Team() {
  const { actor } = await requireSection("/admin/settings/team");
  const { staff, invites } = await listTeam();
  const edit = canTeam(actor);
  const active = staff.filter((s) => s.active === 1);
  const groups = PERM_GROUPS.map((g) => ({ title: g.title, items: g.items.map(([k, l]) => [k, l] as [string, string]) }));

  return (
    <div style={{ maxWidth: 980 }}>
      <PageHeader title="Сотрудники" subtitle={`${active.length} активных. Вход по приглашению; пароль сотрудник задаёт сам.`} actions={edit ? <InvitePanel roles={STAFF_ROLES} groups={groups} defaults={DEFAULT_PERMS} /> : null} />
      {!edit ? <div style={{ marginBottom: 12 }}><Notice tone="info">Вы видите список. Приглашать, менять роли и доступы может владелец.</Notice></div> : null}

      {invites.length ? (
        <Card title={`Ждут входа (${invites.length})`}>
          {invites.map((i) => (
            <div key={i.id} className="ax-row-line" style={{ padding: "6px 0" }}>
              <span>{i.email} <span className="ax-small">· {ROLE_LABEL[i.role as keyof typeof ROLE_LABEL] ?? i.role} · до {dateTime(new Date(i.expires_at * 1000).toISOString())}{i.author ? ` · пригласил ${i.author}` : ""}</span></span>
              {edit ? <ActionButton className="ax-btn-sm ax-btn-ghost" label="Отозвать" action={revokeInviteAction.bind(null, i.id)} confirm="Ссылка перестанет работать." /> : null}
            </div>
          ))}
        </Card>
      ) : null}

      <div className="ax-card" style={{ padding: 0, marginTop: 14 }}>
        <div className="ax-list">
          {staff.map((s) => {
            const self = s.id === actor.id;
            const top = s.role === "owner" || s.role === "director";
            const locked = top || self;
            const roleDialog = (
              <ActionDialog label="Роль" triggerClass="ax-btn-sm" title={`Роль: ${s.display_name}`} description="Владелец и директор видят всё. Для остальных доступы станут как у новой роли. Сотруднику нужно будет войти заново." action={roleAction.bind(null, s.id)} submitLabel="Сменить роль">
                <Field label="Новая роль" htmlFor={`role-${s.id}`}><select id={`role-${s.id}`} name="role" className="ax-input" defaultValue={s.role}>{ALL_ROLES.map((r) => <option key={r.key} value={r.key}>{r.label}</option>)}</select></Field>
              </ActionDialog>
            );
            const positionDialog = (
              <ActionDialog label="Должность" triggerClass="ax-btn-sm" title={`Должность: ${s.display_name}`} description="Подпись в меню, списке сотрудников и документах. Права не меняет." action={positionAction.bind(null, s.id)} submitLabel="Сохранить">
                <Field label="Должность" htmlFor={`pos-${s.id}`}><input id={`pos-${s.id}`} name="position" className="ax-input" defaultValue={s.position} placeholder="Например: Инженер" /></Field>
              </ActionDialog>
            );
            return (
              <div key={s.id} className="ax-list-row" style={{ padding: "12px 16px", flexWrap: "wrap", alignItems: "center", opacity: s.active ? 1 : 0.6 }}>
                <Avatar name={s.display_name} url={s.avatar} size={40} />
                <span className="ax-row-body" style={{ minWidth: 200, flex: 1 }}>
                  <span className="ax-row-t">{s.display_name} {s.active ? null : <Badge tone="bad">заблокирован</Badge>}{s.id === actor.id ? <Badge tone="info">это вы</Badge> : null}</span>
                  <span className="ax-row-s">{staffTitle(s.role, s.position)}{s.position && s.position.trim() !== ROLE_LABEL[s.role] ? ` · права: ${ROLE_LABEL[s.role].toLowerCase()}` : ""} · {s.email}{s.phone ? ` · ${s.phone}` : ""}</span>
                  <span className="ax-row-s">{s.last_seen ? `входил ${ago(s.last_seen)}` : "ещё не входил"}{s.open_sales ? ` · открытых продаж ${s.open_sales}` : ""}{s.open_leads ? ` · заявок в работе ${s.open_leads}` : ""}</span>
                </span>
                {edit && !locked ? (
                  <span style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                    {s.active ? (
                      <>
                        {roleDialog}
                        {positionDialog}
                        <PermEditor id={s.id} groups={groups} initial={s.permissions ?? DEFAULT_PERMS[s.role as "manager"] ?? []} />
                        <ResetLink id={s.id} />
                        <ActionDialog label="Заблокировать" triggerClass="ax-btn-sm ax-btn-ghost" variant="danger" title={`Заблокировать ${s.display_name}?`} description={`Сотрудник сразу выйдет на всех устройствах. Открытые продажи (${s.open_sales}) и заявки (${s.open_leads}) перейдут выбранному коллеге.`} action={blockAction.bind(null, s.id)} submitLabel="Заблокировать">
                          <Field label="Кому передать дела" htmlFor={`re-${s.id}`}><select id={`re-${s.id}`} name="reassignTo" className="ax-input" defaultValue={actor.id}>{active.filter((x) => x.id !== s.id).map((x) => <option key={x.id} value={x.id}>{x.display_name} ({ROLE_LABEL[x.role]})</option>)}</select></Field>
                        </ActionDialog>
                      </>
                    ) : <ActionButton className="ax-btn-sm" label="Разблокировать" action={unblockAction.bind(null, s.id)} />}
                  </span>
                ) : null}
                {edit && s.active && locked ? (
                  <span style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                    {self ? null : roleDialog}
                    {positionDialog}
                    {s.role === "director" && !self ? <ResetLink id={s.id} /> : null}
                  </span>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
