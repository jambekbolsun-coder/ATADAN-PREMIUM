import Link from "next/link";
import { requireSection } from "../../../_lib/session";
import { getCompany, getPolicies } from "../../../_lib/company";
import { listAccounts } from "../../../_lib/money";
import { companyAction, policyAction } from "../../../_lib/settings-actions";
import { getUsdKgsRate } from "../../../../lib/exchange-rate";
import { date, money, type Currency } from "../../../_lib/format";
import { Field } from "../../../_ui/forms";
import { Card, PageHeader } from "../../../_ui/ui";
import { SettingsForm } from "../forms";

export const metadata = { title: "Реквизиты, кассы и курсы" };

export default async function Company() {
  const { actor } = await requireSection("/admin/settings/company");
  const [{ company: c, version }, { sales, penalty }, accounts, fx] = await Promise.all([getCompany(), getPolicies(), listAccounts(), getUsdKgsRate()]);
  const owner = actor.role === "owner";
  return (
    <div style={{ maxWidth: 980 }}>
      <PageHeader title="Реквизиты, кассы и курсы" subtitle="Данные компании для договоров и счетов, правила продаж и деньги" />
      <div className="ax-grid ax-g-main">
        <Card title="Реквизиты компании">
          <SettingsForm action={companyAction}>
            <input type="hidden" name="version" value={version} />
            <div className="ax-grid ax-g2" style={{ gap: 12 }}>
              <Field label="Название (как в уставе)" htmlFor="c-name"><input id="c-name" name="legalName" className="ax-input" defaultValue={c.legalName} placeholder="ОсОО «АТАДАН»" /></Field>
              <Field label="Директор" htmlFor="c-dir"><input id="c-dir" name="director" className="ax-input" defaultValue={c.director} /></Field>
              <Field label="ИНН" htmlFor="c-inn"><input id="c-inn" name="inn" className="ax-input num" inputMode="numeric" defaultValue={c.inn} /></Field>
              <Field label="ОКПО" htmlFor="c-okpo"><input id="c-okpo" name="okpo" className="ax-input num" inputMode="numeric" defaultValue={c.okpo} /></Field>
              <Field label="Телефон" htmlFor="c-phone"><input id="c-phone" name="phone" className="ax-input" defaultValue={c.phone} /></Field>
              <Field label="Email" htmlFor="c-email"><input id="c-email" name="email" className="ax-input" inputMode="email" defaultValue={c.email} /></Field>
            </div>
            <Field label="Юридический адрес" htmlFor="c-addr"><input id="c-addr" name="address" className="ax-input" defaultValue={c.address} /></Field>
            <div className="ax-grid ax-g2" style={{ gap: 12 }}>
              <Field label="Банк" htmlFor="c-bank"><input id="c-bank" name="bankName" className="ax-input" defaultValue={c.bankName} /></Field>
              <Field label="БИК" htmlFor="c-bik"><input id="c-bik" name="bik" className="ax-input num" inputMode="numeric" defaultValue={c.bik} /></Field>
              <Field label="Расчётный счёт, сом" htmlFor="c-acc"><input id="c-acc" name="account" className="ax-input num" defaultValue={c.account} /></Field>
              <Field label="Расчётный счёт, $" htmlFor="c-accusd"><input id="c-accusd" name="accountUsd" className="ax-input num" defaultValue={c.accountUsd} /></Field>
            </div>
            <Field label="Текст для договоров" htmlFor="c-note" hint="Гарантия, условия поставки: попадут в договор и счёт"><textarea id="c-note" name="contractNote" className="ax-input" rows={3} defaultValue={c.contractNote} /></Field>
          </SettingsForm>
        </Card>
        <div className="ax-grid" style={{ alignContent: "start" }}>
          <Card title="Курс доллара">
            <div className="ax-kpi-v num">{fx?.value ? `${fx.value.toFixed(2)} с` : "нет данных"}</div>
            <p className="ax-small" style={{ marginBottom: 0 }}>Официальный курс НБКР{fx?.date ? ` на ${date(fx.date)}` : ""}. Подставляется в продажи и заказы; в каждой операции его можно поправить.</p>
          </Card>
          <Card title="Кассы и счета" more={{ href: "/admin/work/cash", label: "Касса" }}>
            {accounts.length ? accounts.map((a) => <div key={a.id} className="ax-row-line"><span>{a.name}</span><b className="num">{money(a.balance, (a.currency === "USD" || a.currency === "CNY" ? a.currency : "KGS") as Currency)}</b></div>) : <p className="ax-small" style={{ margin: 0 }}>Касс нет. <Link href="/admin/work/cash" style={{ color: "var(--brand)" }}>Добавить</Link></p>}
          </Card>
        </div>
      </div>
      <div style={{ height: 14 }} />
      <Card title="Правила продаж">
        <SettingsForm action={policyAction} disabled={!owner}>
          <div className="ax-grid ax-g3" style={{ gap: 12 }}>
            <Field label="Резерв машины, дней" htmlFor="p-res" hint="По умолчанию при оформлении, максимум 90"><input id="p-res" name="reserveDays" className="ax-input num" inputMode="numeric" defaultValue={sales.reserveDays} /></Field>
            <Field label="Резерв для гослизинга, дней" htmlFor="p-res2" hint="Банк платит дольше"><input id="p-res2" name="stateLeasingReserveDays" className="ax-input num" inputMode="numeric" defaultValue={sales.stateLeasingReserveDays} /></Field>
            <Field label="Продажа ниже себестоимости" htmlFor="p-below"><select id="p-below" name="belowCost" className="ax-input" defaultValue={sales.belowCost}><option value="owner">Только владелец, с причиной</option><option value="nobody">Запрещена всем</option></select></Field>
            <Field label="Пеня в день, %" htmlFor="p-rate"><input id="p-rate" name="ratePerDay" className="ax-input num" inputMode="decimal" defaultValue={penalty.ratePerDay} /></Field>
            <Field label="Дней без пени" htmlFor="p-grace" hint="Льготный срок после даты платежа"><input id="p-grace" name="graceDays" className="ax-input num" inputMode="numeric" defaultValue={penalty.graceDays} /></Field>
            <Field label="Пеня не больше, % от долга" htmlFor="p-max"><input id="p-max" name="maxPercent" className="ax-input num" inputMode="decimal" defaultValue={penalty.maxPercent} /></Field>
            <Field label="Гарантия, месяцев" htmlFor="p-wm" hint="С даты выдачи машины"><input id="p-wm" name="warrantyMonths" className="ax-input num" inputMode="numeric" defaultValue={sales.warrantyMonths} /></Field>
            <Field label="Гарантия, моточасов" htmlFor="p-wh" hint="Что наступит раньше; 0 - без ограничения"><input id="p-wh" name="warrantyHours" className="ax-input num" inputMode="numeric" defaultValue={sales.warrantyHours} /></Field>
          </div>
          {!owner ? <p className="ax-small" style={{ margin: 0 }}>Правила меняет только владелец.</p> : null}
        </SettingsForm>
      </Card>
    </div>
  );
}
