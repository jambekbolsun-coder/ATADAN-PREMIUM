/**
 * Разделы, которые ещё переезжают в новую админку.
 * Каждая ссылка меню ведёт сюда, а отсюда - в рабочий раздел прежней версии: ни одна кнопка не «пустая».
 * Как только раздел готов, у него появляется своя страница, и этот экран для него больше не показывается.
 */
import { notFound, redirect } from "next/navigation";
import { requireStaff } from "../../_lib/session";
import { canSee, findItem } from "../../_lib/nav";
import { ButtonLink, Empty, PageHeader } from "../../_ui/ui";

/** Старые адреса (/admin/company/…, /admin/control/…) из уведомлений и закладок ведут в прежнюю админку. */
const LEGACY_SPACES = new Set(["company", "control"]);

export default async function Moving({ params }: PageProps<"/admin/[...slug]">) {
  const { slug } = await params;
  if (LEGACY_SPACES.has(slug[0])) redirect(`/admin/legacy/${slug.join("/")}`);
  const path = `/admin/${slug.join("/")}`;
  const actor = await requireStaff(path);
  const item = findItem(path);
  if (!item) {
    if (slug[0] === "marketing" && slug.length === 2) redirect(`/admin/legacy/${slug.join("/")}`);
    notFound();
  }
  if (!canSee(actor, item)) notFound();
  return (
    <div style={{ maxWidth: 760 }}>
      <PageHeader title={item.label} subtitle={item.hint} />
      <div className="ax-card">
        <Empty
          icon={item.icon}
          tone={item.tone}
          title="Раздел переезжает в новую админку"
          text={item.legacy ? "Пока он работает в прежней версии: все данные те же, изменения сохраняются сразу." : "Это новый раздел: он появится на одном из следующих этапов."}
          action={item.legacy ? <ButtonLink href={item.legacy} variant="primary">Открыть раздел</ButtonLink> : <ButtonLink href="/admin">На главную</ButtonLink>}
        />
      </div>
    </div>
  );
}
