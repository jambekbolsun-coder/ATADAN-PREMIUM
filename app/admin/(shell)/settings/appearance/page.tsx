import { requireStaff } from "../../../_lib/session";
import { Card, PageHeader } from "../../../_ui/ui";
import { ThemePicker } from "../../../_ui/client";
import { currentTheme } from "../../../_ui/theme-server";

export const metadata = { title: "Тема и вид" };

export default async function Appearance() {
  await requireStaff("/admin/settings/appearance");
  return (
    <div style={{ maxWidth: 760 }}>
      <PageHeader title="Тема и вид" subtitle="Выбор сохраняется на этом устройстве: на телефоне и ноутбуке можно поставить разные темы" />
      <Card title="Тема">
        <ThemePicker initial={await currentTheme()} />
      </Card>
    </div>
  );
}
