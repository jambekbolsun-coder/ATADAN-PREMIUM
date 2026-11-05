import { requireStaff } from "../../../_lib/session";
import { profileAction } from "../../../_lib/settings-actions";
import { ROLE_LABEL } from "../../../_lib/roles";
import { Field } from "../../../_ui/forms";
import { Card, PageHeader } from "../../../_ui/ui";
import { AvatarField, SettingsForm } from "../forms";

export const metadata = { title: "Мой профиль" };

export default async function Profile() {
  const actor = await requireStaff("/admin/settings/profile");
  return (
    <div style={{ maxWidth: 680 }}>
      <PageHeader title="Мой профиль" subtitle={`${ROLE_LABEL[actor.role]} · ${actor.email}. Email и роль меняет владелец или директор.`} />
      <Card>
        <SettingsForm action={profileAction}>
          <Field label="Фото" htmlFor="pf-avatar"><AvatarField initial={actor.avatar ?? ""} /></Field>
          <div className="ax-grid ax-g2" style={{ gap: 12 }}>
            <Field label="Имя и фамилия" htmlFor="pf-name"><input id="pf-name" name="name" className="ax-input" defaultValue={actor.display_name} required /></Field>
            <Field label="Телефон" htmlFor="pf-phone"><input id="pf-phone" name="phone" className="ax-input" inputMode="tel" defaultValue={actor.phone} /></Field>
          </div>
          <Field label="Должность" htmlFor="pf-pos" hint="Видят коллеги и клиенты в документах"><input id="pf-pos" name="position" className="ax-input" defaultValue={actor.position} /></Field>
          <Field label="О себе" htmlFor="pf-bio"><textarea id="pf-bio" name="bio" className="ax-input" rows={3} defaultValue={actor.bio} /></Field>
        </SettingsForm>
      </Card>
    </div>
  );
}
