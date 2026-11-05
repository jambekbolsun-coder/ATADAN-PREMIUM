/**
 * Единая карта админки: меню, права, быстрые действия, заголовки.
 * Один источник и для интерфейса (что показать), и для сервера (requireSection проверяет те же права).
 * Права - это разделы из admin-auth (PermissionSection); у владельца и директора есть все.
 */
import type { PermissionSection, StaffRole } from "../../lib/admin-auth";

export type IconKey =
  | "home" | "inbox" | "cart" | "users" | "tractor" | "box" | "truck" | "wrench" | "wallet" | "scale"
  | "receipt" | "trend" | "chart" | "banknote" | "news" | "percent" | "bank" | "globe" | "gear" | "user"
  | "key" | "palette" | "bell" | "logout" | "swap" | "list" | "shield" | "building" | "briefcase"
  | "megaphone" | "plus" | "upload" | "download" | "smartphone" | "book";

export type Space = "work" | "marketing" | "settings";
export type Tone = "green" | "sun" | "sky" | "lilac" | "terra" | "teal";

export type NavItem = {
  href: string;
  label: string;
  icon: IconKey;
  tone: Tone;
  space: Space;
  /** Подгруппа внутри пространства (в меню - маленький серый заголовок). */
  group?: string;
  /** Кому видно: достаточно любого из прав. Пусто - всем сотрудникам. */
  perms?: PermissionSection[];
  /** Только эти роли (дополнительно к правам). */
  roles?: StaffRole[];
  /** Короткое описание для хабов на телефоне и для пустых экранов. */
  hint: string;
  /** Раздел в прежней админке, пока новый экран не готов. */
  legacy?: string;
};

const FIN_ROLES: StaffRole[] = ["owner", "director", "accountant"];

export const NAV: NavItem[] = [
  // ── Работа · Отдел продаж
  { href: "/admin/work/leads", label: "Заявки", icon: "inbox", tone: "terra", space: "work", group: "Отдел продаж", perms: ["site-leads", "deals"], hint: "Новые обращения с сайта, WhatsApp и звонков" },
  { href: "/admin/work/sales", label: "Продажи", icon: "cart", tone: "green", space: "work", group: "Отдел продаж", perms: ["sales", "deals"], hint: "Кто купил, что, за сколько и как оплатил" },
  { href: "/admin/work/clients", label: "Клиенты", icon: "users", tone: "sky", space: "work", group: "Отдел продаж", perms: ["client-base"], hint: "Покупатели, их техника, долги и история" },
  // ── Работа · Склад и логистика
  { href: "/admin/work/stock", label: "Техника", icon: "tractor", tone: "teal", space: "work", group: "Склад и логистика", perms: ["inventory-units"], hint: "Каждая машина по VIN: статус, место, себестоимость" },
  { href: "/admin/work/parts", label: "Запчасти", icon: "box", tone: "sun", space: "work", group: "Склад и логистика", perms: ["inventory-units"], hint: "Остатки, приход, списание, минимальный остаток" },
  { href: "/admin/work/logistics", label: "Логистика", icon: "truck", tone: "sky", space: "work", group: "Склад и логистика", perms: ["purchases", "shipments", "suppliers"], hint: "Заказы заводу, поставки, таможня, приём на склад" },
  { href: "/admin/work/service", label: "Сервис и гарантия", icon: "wrench", tone: "lilac", space: "work", group: "Склад и логистика", perms: ["service-cases"], hint: "Обращения по технике, гарантийные случаи" },
  // ── Работа · Финансы
  { href: "/admin/work/cash", label: "Касса и платежи", icon: "wallet", tone: "green", space: "work", group: "Финансы", roles: FIN_ROLES, hint: "Все деньги: приход, расход, остатки касс и счетов" },
  { href: "/admin/work/debts", label: "Долги", icon: "scale", tone: "terra", space: "work", group: "Финансы", perms: ["debts"], hint: "Кто нам должен: клиенты и банки, просрочки" },
  { href: "/admin/work/expenses", label: "Расходы", icon: "receipt", tone: "sun", space: "work", group: "Финансы", perms: ["expenses"], hint: "Аренда, реклама, таможня, логистика и прочее" },
  { href: "/admin/work/margin", label: "Маржа", icon: "trend", tone: "teal", space: "work", group: "Финансы", roles: FIN_ROLES, hint: "Прибыль по продаже, модели и менеджеру" },
  { href: "/admin/work/payroll", label: "Зарплаты", icon: "banknote", tone: "lilac", space: "work", group: "Финансы", perms: ["payroll"], hint: "Начисления и выплаты сотрудникам" },
  { href: "/admin/work/reports", label: "Отчёты", icon: "chart", tone: "sky", space: "work", group: "Финансы", roles: FIN_ROLES, hint: "Продажи, склад, деньги и маркетинг за период" },
  // ── Маркетинг
  { href: "/admin/marketing/catalog", label: "Каталог техники", icon: "tractor", tone: "green", space: "marketing", perms: ["catalog"], hint: "Модели на сайте: цены, фото, видимость" },
  { href: "/admin/marketing/parts", label: "Каталог запчастей", icon: "box", tone: "sun", space: "marketing", perms: ["catalog"], hint: "Карточки запчастей для сайта" },
  { href: "/admin/marketing/news", label: "Публикации", icon: "news", tone: "sky", space: "marketing", perms: ["news"], hint: "АгроЖурнал: черновики и опубликованные статьи" },
  { href: "/admin/marketing/promotions", label: "Акции", icon: "percent", tone: "terra", space: "marketing", perms: ["promotions"], hint: "Скидки на модели и запчасти на даты" },
  { href: "/admin/marketing/leasing", label: "Лизинг", icon: "bank", tone: "lilac", space: "marketing", perms: ["leasing", "leasing-models"], hint: "Банки, ставки и взносы для калькулятора на сайте" },
  { href: "/admin/marketing/pages", label: "Страницы сайта", icon: "globe", tone: "teal", space: "marketing", perms: ["public-service", "faq", "site-settings"], hint: "Сервис, FAQ, контакты и общие настройки сайта" },
  { href: "/admin/marketing/analytics", label: "Аналитика сайта", icon: "chart", tone: "sky", space: "marketing", perms: ["site-analytics"], hint: "Посещения, интерес к моделям, заявки по источникам" },
];

/** Экраны настроек. Профиль, тема, уведомления и сеансы есть у всех. */
export const SETTINGS: { title: string; items: NavItem[] }[] = [
  {
    title: "Профиль и аккаунт",
    items: [
      { href: "/admin/settings/profile", label: "Мой профиль", icon: "user", tone: "green", space: "settings", hint: "Имя, телефон, должность, фото" },
      { href: "/admin/settings/security", label: "Пароль и сеансы", icon: "key", tone: "sun", space: "settings", hint: "Смена пароля, активные устройства, выход везде" },
    ],
  },
  {
    title: "Приложение",
    items: [
      { href: "/admin/settings/appearance", label: "Тема и вид", icon: "palette", tone: "lilac", space: "settings", hint: "Лес, Поле или Ночь" },
      { href: "/admin/settings/notifications", label: "Уведомления", icon: "bell", tone: "sky", space: "settings", hint: "О чём и как сообщать" },
    ],
  },
  {
    title: "Компания",
    items: [
      { href: "/admin/settings/team", label: "Сотрудники", icon: "users", tone: "teal", space: "settings", perms: ["team"], hint: "Приглашения, роли, блокировка" },
      { href: "/admin/settings/company", label: "Реквизиты, кассы и курсы", icon: "building", tone: "green", space: "settings", roles: ["owner", "director"], hint: "Реквизиты для документов, кассы и счета, курсы валют, пени, резерв" },
      { href: "/admin/settings/data", label: "Экспорт и импорт", icon: "swap", tone: "lilac", space: "settings", roles: ["owner", "director", "accountant", "marketer"], hint: "Выгрузка в Excel, загрузка из файла, резервная копия" },
      { href: "/admin/settings/audit", label: "Журнал действий", icon: "list", tone: "terra", space: "settings", perms: ["audit"], hint: "Кто, что и когда изменил" },
    ],
  },
];

export type Viewer = { role: StaffRole; permissions: readonly string[] };

export function canSee(viewer: Viewer, item: Pick<NavItem, "perms" | "roles">) {
  const full = viewer.role === "owner" || viewer.role === "director";
  if (item.roles && !item.roles.includes(viewer.role)) return false;
  if (!item.perms?.length || full) return true;
  return item.perms.some((perm) => viewer.permissions.includes(perm));
}

export function visibleNav(viewer: Viewer) {
  return NAV.filter((item) => canSee(viewer, item));
}

export function visibleSettings(viewer: Viewer) {
  return SETTINGS.map((g) => ({ ...g, items: g.items.filter((i) => canSee(viewer, i)) })).filter((g) => g.items.length);
}

export function findItem(path: string): NavItem | undefined {
  const all = [...NAV, ...SETTINGS.flatMap((g) => g.items)];
  return all.sort((a, b) => b.href.length - a.href.length).find((i) => path === i.href || path.startsWith(i.href + "/"));
}

export const SPACE_LABEL: Record<Space, string> = { work: "Работа", marketing: "Маркетинг", settings: "Настройки" };

/** Заголовок верхней панели: «Раздел» и, если нужно, родитель. */
export function titleFor(path: string): { title: string; crumb?: string } {
  if (path === "/admin") return { title: "Главная" };
  if (path === "/admin/work") return { title: "Работа" };
  if (path === "/admin/marketing") return { title: "Маркетинг" };
  if (path === "/admin/settings") return { title: "Настройки" };
  const item = findItem(path);
  if (!item) return { title: "ATADAN" };
  return { title: item.label, crumb: item.group ?? SPACE_LABEL[item.space] };
}

/** Куда ведёт «Назад» на телефоне. null - экран верхнего уровня. */
export function backFor(path: string): string | null {
  const parts = path.split("/").filter(Boolean);
  if (parts.length <= 2) return null;
  if (parts.length === 3) return "/" + parts.slice(0, 2).join("/");
  return "/" + parts.slice(0, 3).join("/");
}

export function isActive(path: string, href: string) {
  return href === "/admin" ? path === "/admin" : path === href || path.startsWith(href + "/");
}

// ───────── кнопка «＋» / «Создать» ─────────
export type PlusAction = { key: string; label: string; hint: string; icon: IconKey; tone: Tone; href: string; perms?: PermissionSection[]; roles?: StaffRole[] };

export const PLUS_ACTIONS: PlusAction[] = [
  { key: "sale", label: "Новая продажа", hint: "Клиент, техника, способ оплаты", icon: "cart", tone: "green", href: "/admin/work/sales/new", perms: ["sales", "deals"] },
  { key: "payment", label: "Приход или расход", hint: "Касса: приход, расход, перевод", icon: "wallet", tone: "sun", href: "/admin/work/cash/new", roles: ["owner", "director", "accountant"] },
  { key: "expense", label: "Добавить расход", hint: "Сумма, категория, касса", icon: "receipt", tone: "terra", href: "/admin/work/cash/new?type=out", roles: ["owner", "director", "accountant"] },
  { key: "receive", label: "Принять технику", hint: "Поставка пришла на склад", icon: "truck", tone: "sky", href: "/admin/work/logistics?tab=shipments", perms: ["shipments", "purchases"] },
  { key: "lead", label: "Новая заявка", hint: "Звонок или визит в офис", icon: "inbox", tone: "teal", href: "/admin/work/leads/new", perms: ["site-leads", "deals"] },
  { key: "model", label: "Модель в каталог", hint: "Цена, фото, характеристики", icon: "tractor", tone: "lilac", href: "/admin/marketing/catalog/new", perms: ["catalog"] },
  { key: "part", label: "Запчасть", hint: "Артикул, цена, к каким моделям", icon: "box", tone: "sun", href: "/admin/work/parts/new", perms: ["catalog"] },
  { key: "post", label: "Публикация", hint: "Статья в АгроЖурнал", icon: "news", tone: "sky", href: "/admin/marketing/news/new", perms: ["news"] },
  { key: "invite", label: "Пригласить сотрудника", hint: "Ссылка-приглашение на 24 часа", icon: "users", tone: "teal", href: "/admin/settings/team", perms: ["team"] },
];

export function visiblePlus(viewer: Viewer) {
  return PLUS_ACTIONS.filter((a) => canSee(viewer, a));
}

/** 4-я позиция нижнего меню: «Маркетинг», если он есть у роли, иначе главный раздел роли. */
export function roleTab(viewer: Viewer): { href: string; label: string; icon: IconKey; match: string[] } {
  const nav = visibleNav(viewer);
  if (nav.some((i) => i.space === "marketing")) return { href: "/admin/marketing", label: "Маркетинг", icon: "megaphone", match: ["/admin/marketing"] };
  if (viewer.role === "accountant") return { href: "/admin/work/cash", label: "Финансы", icon: "wallet", match: ["/admin/work/cash", "/admin/work/debts", "/admin/work/expenses", "/admin/work/payroll"] };
  return { href: "/admin/work/sales", label: "Продажи", icon: "cart", match: ["/admin/work/sales", "/admin/work/leads", "/admin/work/clients"] };
}
