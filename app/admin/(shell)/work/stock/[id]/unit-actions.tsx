"use client";
import { ClipboardCheck, PencilLine, TriangleAlert, Trash2 } from "lucide-react";
import { ActionButton, ActionDialog, Field } from "../../../../_ui/forms";
import { damageAction, pdiAction, unitCostAction, updateUnitAction, writeOffAction } from "../../../../_lib/stock-actions";

type Info = { engine: string; year: string; color: string; gtd: string; certificate: string; passport: string; location: string; listPrice: string };

export function UnitActions({ unitId, canPdi, canWriteOff, damage, info, canPrice, canIntake, vin, slug, models, costOverride }: { canIntake?: boolean; vin?: string; slug?: string; models?: { slug: string; model: string }[]; costOverride?: string; unitId: string; canPdi: boolean; canWriteOff: boolean; damage: string; info: Info; canPrice: boolean }) {
  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
      {canPdi ? <ActionButton label={<><ClipboardCheck size={17} aria-hidden />PDI выполнен</>} variant="primary" confirm="Отметить предпродажную подготовку выполненной? Машина станет готовой к выдаче." action={() => pdiAction(unitId)} /> : null}
      <ActionDialog label={<><PencilLine size={17} aria-hidden />Изменить данные</>} title="Данные машины" action={updateUnitAction.bind(null, unitId)} submitLabel="Сохранить">
        <div className="ax-grid ax-g2" style={{ gap: 12 }}>
          {canIntake ? <Field label="VIN" htmlFor="u-vin"><input id="u-vin" name="vin" className="ax-input num" defaultValue={vin} required /></Field> : null}
          {canIntake ? <Field label="Модель" htmlFor="u-slug" hint="Нельзя менять, если машина уже в продаже"><select id="u-slug" name="slug" className="ax-input" defaultValue={slug}>{models?.map((m) => <option key={m.slug} value={m.slug}>{m.model}</option>)}</select></Field> : null}
          <Field label="№ двигателя" htmlFor="u-eng"><input id="u-eng" name="engine" className="ax-input" defaultValue={info.engine} /></Field>
          <Field label="Год выпуска" htmlFor="u-year"><input id="u-year" name="year" className="ax-input num" inputMode="numeric" defaultValue={info.year} /></Field>
          <Field label="Цвет" htmlFor="u-color"><input id="u-color" name="color" className="ax-input" defaultValue={info.color} /></Field>
          <Field label="Где стоит" htmlFor="u-loc"><input id="u-loc" name="location" className="ax-input" defaultValue={info.location} placeholder="Склад Бишкек" /></Field>
          <Field label="№ ГТД" htmlFor="u-gtd"><input id="u-gtd" name="gtd" className="ax-input" defaultValue={info.gtd} /></Field>
          <Field label="Сертификат ТР ТС" htmlFor="u-cert"><input id="u-cert" name="certificate" className="ax-input" defaultValue={info.certificate} /></Field>
          <Field label="Паспорт СТМ" htmlFor="u-pass"><input id="u-pass" name="passport" className="ax-input" defaultValue={info.passport} /></Field>
          {canPrice ? <Field label="Цена прайса, сом" htmlFor="u-price" hint="Подставляется в продажу"><input id="u-price" name="listPrice" className="ax-input num" inputMode="decimal" defaultValue={info.listPrice} /></Field> : null}
        </div>
      </ActionDialog>
      {canIntake ? (
        <ActionDialog label="Себестоимость" title="Себестоимость этой машины" description="Важнее себестоимости из поставки и прайса. Оставьте пусто, чтобы считалась автоматически." action={unitCostAction.bind(null, unitId)} submitLabel="Сохранить">
          <Field label="Себестоимость, сом" htmlFor="u-cost"><input id="u-cost" name="cost" className="ax-input num" inputMode="decimal" defaultValue={costOverride} /></Field>
        </ActionDialog>
      ) : null}
      <ActionDialog label={<><TriangleAlert size={17} aria-hidden />{damage ? "Повреждение" : "Отметить повреждение"}</>} title="Повреждение" description="Опишите, что повреждено. Чтобы снять отметку, очистите поле и сохраните." action={damageAction.bind(null, unitId)} submitLabel="Сохранить">
        <Field label="Что повреждено" htmlFor="u-dmg"><textarea id="u-dmg" name="note" className="ax-input" defaultValue={damage} placeholder="Трещина капота при разгрузке" /></Field>
      </ActionDialog>
      {canWriteOff ? (
        <ActionDialog label={<><Trash2 size={17} aria-hidden />Списать</>} triggerClass="ax-btn-danger" title="Списать машину" description="Машина уйдёт со склада и из наличия на сайте. Действие видно в журнале." action={writeOffAction.bind(null, unitId)} submitLabel="Списать" variant="danger">
          <Field label="Причина" htmlFor="u-wo"><input id="u-wo" name="reason" className="ax-input" required /></Field>
        </ActionDialog>
      ) : null}
    </div>
  );
}
