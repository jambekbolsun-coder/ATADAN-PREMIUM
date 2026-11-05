import { requireSection } from "../../../../_lib/session";
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, listAccounts } from "../../../../_lib/money";
import { Card, PageHeader } from "../../../../_ui/ui";
import { MovementDialog, NewAccountDialog, TransferDialog } from "../cash-actions";

export const metadata = { title: "Приход или расход" };

/** Быстрые действия кассы (из кнопки «＋» на телефоне). */
export default async function CashNew() {
  const { actor } = await requireSection("/admin/work/cash");
  const accounts = await listAccounts();
  const owner = actor.role === "owner";
  return (
    <div style={{ maxWidth: 640 }}>
      <PageHeader title="Приход или расход" subtitle="Оплаты клиентов по продажам записывайте в карточке продажи, оплату заводу и расходы поставок - в Логистике" />
      <Card>
        <div style={{ display: "grid", gap: 10 }}>
          <MovementDialog direction="out" accounts={accounts} categories={EXPENSE_CATEGORIES} isOwner={owner} defaultOpenLabel="Записать расход" />
          <MovementDialog direction="in" accounts={accounts} categories={INCOME_CATEGORIES} isOwner={owner} defaultOpenLabel="Записать приход" />
          <TransferDialog accounts={accounts} />
          <NewAccountDialog />
        </div>
      </Card>
    </div>
  );
}
