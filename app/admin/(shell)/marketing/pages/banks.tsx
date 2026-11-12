/**
 * Вкладка «Банки и ставки»: список банков для калькулятора на сайте и максимальный срок лизинга.
 * Банки хранятся в тех же записях, что «Маркетинг → Лизинг → Программы банков» (admin_records, kind='leasing_terms'),
 * срок: site_settings key='leasing'. Логика и проверки: app/admin/_lib/site-admin.ts.
 */
import Link from "next/link";
import { CalendarClock, Landmark, Pencil, Plus } from "lucide-react";
import type { Bank } from "../../../_lib/site-admin";
import { bankActiveAction, deleteBankAction, saveBankAction, saveLeaseTermAction } from "../../../_lib/marketing-actions";
import { formatLeaseTerm, LEASE_TERM_HARD_MAX, leaseTermChoices } from "../../../../lib/leasing";
import { ActionButton, ActionDialog, Field } from "../../../_ui/forms";
import { Badge, Card, Notice } from "../../../_ui/ui";

const pct = (v: number | null) => (v === null ? "не задано" : `${v.toLocaleString("ru-RU")}%`);

function BankFields({ bank }: { bank?: Bank }) {
  const id = (k: string) => `bank-${bank?.id ?? "new"}-${k}`;
  return (
    <div className="ax-grid" style={{ gap: 12 }}>
      <Field label="Название банка" htmlFor={id("name")}>
        <input id={id("name")} name="name" className="ax-input" defaultValue={bank?.name ?? ""} placeholder="Айыл Банк" required minLength={2} maxLength={120} />
      </Field>
      <div className="ax-grid ax-g2" style={{ gap: 12 }}>
        <Field label="Годовая ставка, %" htmlFor={id("rate")} hint="Например: 6">
          <input id={id("rate")} name="annualRate" className="ax-input num" inputMode="decimal" defaultValue={bank?.annualRate ?? ""} required />
        </Field>
        <Field label="Минимальный первый взнос, %" htmlFor={id("down")} hint="Клиент не сможет поставить меньше">
          <input id={id("down")} name="minDownPercent" className="ax-input num" inputMode="decimal" defaultValue={bank?.minDownPercent ?? ""} required />
        </Field>
        <Field label="Комиссия, %" htmlFor={id("fee")} hint="От суммы финансирования. Пусто: без комиссии">
          <input id={id("fee")} name="commissionPercent" className="ax-input num" inputMode="decimal" defaultValue={bank?.commissionPercent ?? ""} />
        </Field>
        <Field label="Порядок показа" htmlFor={id("sort")} hint="Меньше число: выше в списке. Пусто: в конец">
          <input id={id("sort")} name="sortOrder" className="ax-input num" inputMode="numeric" defaultValue={bank ? String(bank.sortOrder) : ""} />
        </Field>
      </div>
      <label className="ax-check" style={{ borderBottom: 0 }}>
        <input type="checkbox" name="active" defaultChecked={bank ? bank.active : true} /> Показывать в калькуляторе на сайте
      </label>
    </div>
  );
}

export function BanksSection({ banks, maxMonths, termVersion, canEdit }: { banks: Bank[]; maxMonths: number; termVersion: number; canEdit: boolean }) {
  const denied = canEdit ? undefined : "Менять может владелец, директор или сотрудник с доступом «Лизинг»";
  const active = banks.filter((b) => b.active);
  return (
    <div className="ax-grid" style={{ gap: 14, maxWidth: 980 }}>
      <Notice>
        Клиент на сайте выбирает банк из включённых, и калькулятор подставляет его ставку, минимальный взнос и комиссию.
        {active.length ? null : " Сейчас включённых банков нет, поэтому калькулятор считает по настройкам «Калькулятор по умолчанию» на вкладке «Контакты и калькулятор»."}
      </Notice>

      <Card title={<><Landmark size={18} aria-hidden /> Банки</>}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", marginBottom: 12 }}>
          <ActionDialog label={<><Plus size={16} aria-hidden /> Добавить банк</>} triggerClass="ax-btn-primary" title="Новый банк" description="Банк сразу появится в калькуляторе, если оставить галочку «Показывать»." action={saveBankAction.bind(null, null, 0)} submitLabel="Добавить" disabled={!canEdit} disabledReason={denied}>
            <BankFields />
          </ActionDialog>
          <span className="ax-small">Включено: {active.length} из {banks.length}</span>
        </div>
        {banks.length ? (
          <div className="ax-table-wrap">
            <table className="ax-table">
              <thead>
                <tr><th className="r">Порядок</th><th>Банк</th><th className="r">Ставка</th><th className="r">Мин. взнос</th><th className="r">Комиссия</th><th>На сайте</th><th aria-label="Действия" /></tr>
              </thead>
              <tbody>
                {banks.map((b) => (
                  <tr key={b.id}>
                    <td className="r num">{b.sortOrder}</td>
                    <td>
                      <b>{b.name}</b>
                      {b.extras.length ? <div className="ax-small">Доп. условия: {b.extras.join(", ")}. <Link href={`/admin/marketing/leasing?edit=${b.id}`}>Открыть в разделе Лизинг</Link></div> : null}
                    </td>
                    <td className="r num">{pct(b.annualRate)}</td>
                    <td className="r num">{b.minDownPercent === null ? "не задано" : `от ${pct(b.minDownPercent)}`}</td>
                    <td className="r num">{b.commissionPercent ? pct(b.commissionPercent) : "нет"}</td>
                    <td>{b.active ? <Badge tone="good">Включён</Badge> : <Badge tone="mute">Выключен</Badge>}</td>
                    <td>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, justifyContent: "flex-end" }}>
                        <ActionDialog label={<><Pencil size={15} aria-hidden /> Изменить</>} triggerClass="ax-btn-sm" title={`Банк: ${b.name}`} action={saveBankAction.bind(null, b.id, b.version)} submitLabel="Сохранить" disabled={!canEdit} disabledReason={denied}>
                          <BankFields bank={b} />
                        </ActionDialog>
                        {b.active
                          ? <ActionButton className="ax-btn-sm" label="Выключить" action={bankActiveAction.bind(null, b.id, false)} disabled={!canEdit} />
                          : <ActionButton className="ax-btn-sm" label="Включить" action={bankActiveAction.bind(null, b.id, true)} disabled={!canEdit} />}
                        <ActionButton className="ax-btn-sm" variant="danger" label="Удалить" action={deleteBankAction.bind(null, b.id)} confirm={`Удалить банк «${b.name}»? Он пропадёт из калькулятора и из этого списка. Уже отправленные заявки сохранятся.`} disabled={!canEdit} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <p className="ax-small" style={{ margin: 0 }}>Банков пока нет. Добавьте первый, например «Айыл Банк», 6% годовых.</p>}
        <p className="ax-small" style={{ marginBottom: 0 }}>
          Это те же записи, что в разделе <Link href="/admin/marketing/leasing">Маркетинг → Лизинг → Программы банков</Link>. Там же можно задать редкие условия: страховку, опции, удорожание, даты действия.
        </p>
      </Card>

      <Card title={<><CalendarClock size={18} aria-hidden /> Срок лизинга на сайте</>}>
        <div className="ax-row-line" style={{ marginBottom: 8 }}>
          <span className="ax-small">Клиент выбирает срок</span>
          <b className="num">от 1 месяца до {formatLeaseTerm(maxMonths)}</b>
        </div>
        <p className="ax-small" style={{ marginTop: 0 }}>Быстрые кнопки в калькуляторе: {leaseTermChoices(maxMonths).join(", ")} мес. По умолчанию выбран максимальный срок.</p>
        <ActionDialog label="Изменить срок" triggerClass="ax-btn-sm" title="Максимальный срок лизинга" description={`Клиент сможет выбрать срок от 1 месяца до этого значения. Не больше ${LEASE_TERM_HARD_MAX} месяцев.`} action={saveLeaseTermAction.bind(null, termVersion)} submitLabel="Сохранить" disabled={!canEdit} disabledReason={denied}>
          <Field label="Максимальный срок, месяцев" htmlFor="lease-max-months" hint="Например: 84 (7 лет) или 96 (8 лет)">
            <input id="lease-max-months" name="maxMonths" className="ax-input num" type="number" min={1} max={LEASE_TERM_HARD_MAX} step={1} inputMode="numeric" defaultValue={maxMonths} required />
          </Field>
        </ActionDialog>
      </Card>
    </div>
  );
}
