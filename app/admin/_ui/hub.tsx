/** Экран-список разделов пространства (Работа, Маркетинг). На телефоне это главная навигация, на ноутбуке - обзор. */
import type { NavItem } from "../_lib/nav";
import { Grouped, PageHeader, RowLink } from "./ui";

export function Hub({ title, subtitle, items }: { title: string; subtitle: string; items: NavItem[] }) {
  const groups = [...new Set(items.map((i) => i.group ?? ""))];
  return (
    <div style={{ maxWidth: 760 }}>
      <PageHeader title={title} subtitle={subtitle} />
      {groups.map((g) => (
        <Grouped key={g} title={g || undefined}>
          {items.filter((i) => (i.group ?? "") === g).map((i) => (
            <RowLink key={i.href} href={i.href} icon={i.icon} tone={i.tone} label={i.label} hint={i.hint} />
          ))}
        </Grouped>
      ))}
    </div>
  );
}
