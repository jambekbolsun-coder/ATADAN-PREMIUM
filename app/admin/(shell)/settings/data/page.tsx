import { Download, ShieldCheck } from "lucide-react";
import { canUseSection } from "../../../../lib/admin-auth";
import { requireSection } from "../../../_lib/session";
import { Card, PageHeader } from "../../../_ui/ui";
import { ImportWizard } from "./import-wizard";

export const metadata = { title: "Экспорт и импорт" };

export default async function DataPage() {
  const { actor } = await requireSection("/admin/settings/data");
  const fin = actor.role === "owner" || actor.role === "director" || actor.role === "accountant";
  const can = (p: string) => canUseSection(actor, p);
  const exports = [
    { key: "sales", label: "Продажи", hint: actor.role === "manager" ? "только ваши" : "все продажи с оплатами", ok: can("sales") || can("deals") },
    { key: "clients", label: "Клиенты", hint: "имя, телефон, регион, покупки", ok: can("client-base") },
    { key: "units", label: "Техника по VIN", hint: "статус, где стоит, поставка", ok: can("inventory-units") },
    { key: "parts", label: "Запчасти", hint: "артикулы, цены, остатки", ok: can("inventory-units") || can("catalog") || fin },
    { key: "cash", label: "Касса и платежи", hint: "все проводки", ok: fin },
    { key: "debts", label: "Долги", hint: "кто должен и сколько просрочено", ok: can("debts") || fin },
    { key: "catalog", label: "Каталог техники", hint: "модели, цены, статусы", ok: can("catalog") },
    { key: "audit", label: "Журнал действий", hint: "кто и что менял", ok: can("audit") },
  ].filter((e) => e.ok);
  const kinds = [
    { key: "parts", label: "Запчасти", endpoint: "import" as const, columns: ["Артикул", "Название", "Группа", "Ед", "Цена продажи", "Себестоимость", "Остаток", "Минимум", "Место", "На сайте"], example: ["CF4C-1012100", "Фильтр масляный", "Фильтры", "шт", "1200", "700", "15", "5", "Стеллаж 3", "да"], hint: "Ключ: артикул. Остаток ставится только новым позициям", ok: can("inventory-units") || can("catalog") || fin },
    { key: "customers", label: "Клиенты", endpoint: "data" as const, columns: ["name", "phone", "email", "region", "source"], example: ["Асанов Талант", "+996772334455", "", "Чуй", "импорт"], hint: "Ключ: телефон. Существующие пропускаются", ok: can("client-base") },
    { key: "inventory", label: "Техника по VIN (остатки на складе)", endpoint: "data" as const, columns: ["vin", "model", "tractorSlug", "purchaseCost", "expenses", "salePrice", "location"], example: ["LCFCFG1204N099999", "CFG1204-B", "cfg1204-b", "1150000", "120000", "1565000", "Склад Бишкек"], hint: "Ключ: VIN. Существующие пропускаются", ok: can("inventory-units") },
  ].filter((k) => k.ok);

  return (
    <div style={{ maxWidth: 980 }}>
      <PageHeader title="Экспорт и импорт" subtitle="Выгрузка в Excel и загрузка списков из файла. Каждое действие записывается в журнал." />
      <Card title="Выгрузить в Excel">
        <div className="ax-grid ax-g2" style={{ gap: 8 }}>
          {exports.map((e) => (
            <a key={e.key} className="ax-row" href={`/api/admin/export?type=${e.key}`} style={{ border: "1px solid var(--border)", borderRadius: 12 }}>
              <Download size={18} aria-hidden style={{ color: "var(--brand)" }} />
              <span className="ax-row-body"><span className="ax-row-t">{e.label}</span><span className="ax-row-s">{e.hint}</span></span>
            </a>
          ))}
        </div>
        <p className="ax-small" style={{ marginBottom: 0 }}>Файл CSV открывается в Excel. {fin ? "" : "Себестоимость и маржа в выгрузку не попадают."}</p>
      </Card>
      <div style={{ height: 14 }} />
      {kinds.length ? <Card title="Загрузить из файла"><ImportWizard kinds={kinds} /></Card> : null}
      {actor.role === "owner" ? (
        <>
          <div style={{ height: 14 }} />
          <Card title="Полная резервная копия">
            <p className="ax-small" style={{ marginTop: 0 }}>Все данные компании одним файлом JSON: продажи, клиенты, склад, касса, каталог, публикации, журнал. Пароли и сессии в копию не входят. Храните файл в надёжном месте: в нём вся база клиентов.</p>
            <a className="ax-btn" href="/api/admin/export?type=backup"><ShieldCheck size={16} aria-hidden />Скачать копию</a>
          </Card>
        </>
      ) : null}
    </div>
  );
}
