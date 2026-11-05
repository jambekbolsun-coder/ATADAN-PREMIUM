"use client";
/**
 * Оболочка админки (по образцу Citadel):
 *  - ноутбук: левое меню с группами и кнопкой «Создать», верхняя панель с поиском и уведомлениями;
 *  - телефон: верхняя панель с «Назад», нижнее меню из 5 позиций и кнопка «＋» по центру.
 */
import Link, { useLinkStatus } from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, type ReactNode } from "react";
import { Bell, ChevronLeft, ChevronRight, Plus, Search, X } from "lucide-react";
import { Icon } from "./icons";
import { Avatar, cn } from "./ui";
import { backFor, isActive, titleFor, type IconKey, type NavItem, type PlusAction, type Space } from "../_lib/nav";

const PLUS_EVENT = "ax:plus";
export function openPlus() {
  window.dispatchEvent(new Event(PLUS_EVENT));
}

function Pending() {
  const { pending } = useLinkStatus();
  return <span aria-hidden className={cn("ax-pending", pending && "is-on")} />;
}

export type ShellUser = { name: string; role: string; avatar: string | null };
export type ShellProps = {
  nav: NavItem[];
  user: ShellUser;
  plus: PlusAction[];
  tab: { href: string; label: string; icon: IconKey; match: string[] };
  unread: number;
  counts: Record<string, number>;
  children: ReactNode;
};

export function AdminShell({ nav, user, plus, tab, unread, counts, children }: ShellProps) {
  return (
    <div className="ax-app">
      <a href="#ax-main" className="ax-skip">Перейти к содержимому</a>
      <Sidebar nav={nav} user={user} counts={counts} canCreate={plus.length > 0} />
      <div className="ax-col">
        <TopBar user={user} unread={unread} />
        <main id="ax-main" className="ax-main">{children}</main>
      </div>
      <BottomNav tab={tab} canCreate={plus.length > 0} />
      <PlusSheet actions={plus} />
    </div>
  );
}

const SPACE_TITLE: Record<Space, string> = { work: "Работа", marketing: "Маркетинг", settings: "Система" };

function Sidebar({ nav, user, counts, canCreate }: { nav: NavItem[]; user: ShellUser; counts: Record<string, number>; canCreate: boolean }) {
  const path = usePathname();
  const spaces: Space[] = ["work", "marketing"];
  return (
    <aside className="ax-side" aria-label="Меню админки">
      <Link href="/admin" className="ax-logo">
        <span className="ax-logo-tile">A</span>
        <span><b>ATADAN</b><small>Админ-панель</small></span>
      </Link>
      {canCreate ? (
        <button type="button" className="ax-create" onClick={openPlus} aria-haspopup="dialog" aria-controls="ax-plus-sheet">
          <Plus size={18} aria-hidden /> Создать
        </button>
      ) : null}
      <nav>
        <NavLink href="/admin" label="Главная" icon="home" active={path === "/admin"} />
        {spaces.map((space) => {
          const items = nav.filter((i) => i.space === space);
          if (!items.length) return null;
          let lastGroup: string | undefined;
          return (
            <div key={space}>
              <div className="ax-grp">{SPACE_TITLE[space]}</div>
              {items.map((i) => {
                const header = i.group && i.group !== lastGroup ? i.group : null;
                lastGroup = i.group;
                return (
                  <div key={i.href}>
                    {header ? <div className="ax-sub">{header}</div> : null}
                    <NavLink href={i.href} label={i.label} icon={i.icon} active={isActive(path, i.href)} count={counts[i.href]} />
                  </div>
                );
              })}
            </div>
          );
        })}
        <div className="ax-grp">{SPACE_TITLE.settings}</div>
        <NavLink href="/admin/settings" label="Настройки" icon="gear" active={isActive(path, "/admin/settings")} />
      </nav>
      <Link href="/admin/settings/profile" className="ax-me">
        <Avatar name={user.name} url={user.avatar} />
        <span style={{ minWidth: 0 }}>
          <b style={{ fontSize: 13.5, display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user.name}</b>
          <small>{user.role}</small>
        </span>
      </Link>
    </aside>
  );
}

function NavLink({ href, label, icon, active, count }: { href: string; label: string; icon: IconKey; active: boolean; count?: number }) {
  return (
    <Link href={href} className="ax-nav" aria-current={active ? "page" : undefined}>
      <Icon name={icon} size={18} />
      {label}
      {count ? <span className="ax-cnt">{count > 99 ? "99+" : count}</span> : null}
      <Pending />
    </Link>
  );
}

function TopBar({ user, unread }: { user: ShellUser; unread: number }) {
  const path = usePathname();
  const router = useRouter();
  const { title, crumb } = titleFor(path);
  const back = backFor(path);
  const depth = useRef(0);
  useEffect(() => {
    depth.current += 1;
  }, [path]);
  return (
    <header className="ax-top">
      <Link href="/admin/settings/profile" className="ax-tap ax-only-mobile" aria-label="Мой профиль">
        <Avatar name={user.name} url={user.avatar} size={32} />
      </Link>
      {back ? (
        <Link
          href={back}
          aria-label="Назад"
          className="ax-tap"
          onClick={(e) => {
            if (depth.current > 1 && window.history.length > 1) {
              e.preventDefault();
              router.back();
            }
          }}
        >
          <ChevronLeft size={24} aria-hidden />
        </Link>
      ) : null}
      <h1>
        {crumb ? <span className="ax-crumb">{crumb} / </span> : null}
        {title}
      </h1>
      <Link href="/admin/search" className="ax-search" aria-label="Поиск">
        <Search size={16} aria-hidden /> Поиск: VIN, клиент, телефон, № продажи
      </Link>
      <Link href="/admin/search" className="ax-tap ax-only-mobile" aria-label="Поиск">
        <Search size={21} aria-hidden />
      </Link>
      <Link href="/admin/notifications" className="ax-tap" aria-label={unread ? `Уведомления: ${unread} непрочитанных` : "Уведомления"}>
        <Bell size={21} aria-hidden />
        {unread > 0 ? <span className="ax-dot">{unread > 99 ? "99+" : unread}</span> : null}
      </Link>
    </header>
  );
}

function BottomNav({ tab, canCreate }: { tab: ShellProps["tab"]; canCreate: boolean }) {
  const path = usePathname();
  const items: ({ href: string; label: string; icon: IconKey; active: boolean } | null)[] = [
    { href: "/admin", label: "Главная", icon: "home", active: path === "/admin" },
    { href: "/admin/work", label: "Работа", icon: "briefcase", active: isActive(path, "/admin/work") && !tab.match.some((m) => isActive(path, m)) },
    null,
    { href: tab.href, label: tab.label, icon: tab.icon, active: tab.match.some((m) => isActive(path, m)) },
    { href: "/admin/settings", label: "Настройки", icon: "gear", active: isActive(path, "/admin/settings") },
  ];
  return (
    <nav className="ax-bottom" aria-label="Нижнее меню">
      {items.map((i) =>
        i ? (
          <Link key={i.href} href={i.href} aria-current={i.active ? "page" : undefined}>
            <Icon name={i.icon} size={23} strokeWidth={i.active ? 2.3 : 1.9} />
            <span>{i.label}</span>
            <Pending />
          </Link>
        ) : (
          <div key="plus" className="ax-plus">
            {canCreate ? (
              <button type="button" onClick={openPlus} aria-haspopup="dialog" aria-controls="ax-plus-sheet" aria-label="Создать">
                <Plus size={28} strokeWidth={2.4} aria-hidden />
              </button>
            ) : null}
          </div>
        ),
      )}
    </nav>
  );
}

function PlusSheet({ actions }: { actions: PlusAction[] }) {
  const ref = useRef<HTMLDialogElement>(null);
  const path = usePathname();
  useEffect(() => {
    const open = () => {
      if (!ref.current?.open) ref.current?.showModal();
    };
    window.addEventListener(PLUS_EVENT, open);
    return () => window.removeEventListener(PLUS_EVENT, open);
  }, []);
  useEffect(() => {
    ref.current?.close();
  }, [path]);
  if (!actions.length) return null;
  const close = () => ref.current?.close();
  return (
    // Клик по затемнению закрывает лист; Esc закрывает <dialog> штатно, поэтому отдельный обработчик клавиш не нужен.
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions
    <dialog
      ref={ref}
      id="ax-plus-sheet"
      className="ax-sheet"
      aria-labelledby="ax-plus-title"
      onClick={(e) => {
        if (e.target === ref.current) close();
      }}
    >
      <div className="ax-sheet-panel">
        <div className="ax-grip" aria-hidden />
        <div style={{ display: "flex", alignItems: "center", marginBottom: 10 }}>
          <h2 id="ax-plus-title" style={{ flex: 1 }}>Что сделать?</h2>
          <button type="button" className="ax-tap" onClick={close} aria-label="Закрыть">
            <X size={22} aria-hidden />
          </button>
        </div>
        <ul className="ax-grouped" style={{ background: "var(--surface-2)", border: 0, margin: 0 }}>
          {actions.map((a) => (
            <li key={a.key}>
              <Link href={a.href} className="ax-row" onClick={close}>
                <span className={cn("ax-ic ax-ic-sm", `ax-c-${a.tone}`)}><Icon name={a.icon} size={17} /></span>
                <span className="ax-row-body">
                  <span className="ax-row-t">{a.label}</span>
                  <span className="ax-row-s">{a.hint}</span>
                </span>
                <span className="ax-row-end"><ChevronRight size={18} aria-hidden /></span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </dialog>
  );
}
