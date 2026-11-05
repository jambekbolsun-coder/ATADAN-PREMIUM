/**
 * Сотрудники (Настройки → Сотрудники). Те же правила, что в старой админке
 * (app/api/admin/invites, crm staff_*, security create_reset), плюс:
 *  - смена роли (менеджер / бухгалтер / маркетолог) без пересоздания сотрудника;
 *  - при блокировке открытые продажи и заявки нового отдела продаж передаются другому сотруднику.
 *
 * Владельца и директора здесь не блокируют и не ограничивают. Себя тоже.
 * Ссылки приглашения и восстановления одноразовые; в базе хранится только хеш.
 */
import { headers } from "next/headers";
import { getRawDb } from "../../../db";
import type { Actor, PermissionSection, StaffRole } from "../../lib/admin-auth";
import { permissionSections } from "../../lib/admin-auth";
import { digest, HttpError } from "../../lib/security";
import { audit, isBoss, query, text } from "./db-kit";

export const canTeam = (a: Actor) => isBoss(a);
export const STAFF_ROLES: { key: StaffRole; label: string; hint: string }[] = [
  { key: "manager", label: "Менеджер по продажам", hint: "Заявки, продажи, клиенты, склад (просмотр и резерв)" },
  { key: "accountant", label: "Бухгалтер", hint: "Касса, долги, расходы, логистика, зарплаты" },
  { key: "marketer", label: "Маркетолог", hint: "Каталог, публикации, акции, лизинг, сайт" },
];
export const DEFAULT_PERMS: Record<"manager" | "accountant" | "marketer", PermissionSection[]> = {
  manager: ["deals", "client-base", "inventory-units", "sales", "meetings", "documents", "service-cases", "payments", "employee-tasks", "notifications", "chat", "groups", "leasing-applications", "site-leads"],
  accountant: ["suppliers", "purchases", "shipments", "expenses", "finance", "financial-accounts", "payroll", "payments", "debts", "documents", "employee-tasks", "notifications", "chat", "groups"],
  marketer: ["catalog", "news", "public-service", "faq", "leasing", "leasing-models", "promotions", "site-leads", "site-analytics", "employee-tasks", "notifications", "chat", "groups"],
};
/** Подписи разделов доступа, сгруппированные как в меню. */
export const PERM_GROUPS: { title: string; items: [PermissionSection, string][] }[] = [
  { title: "Отдел продаж", items: [["site-leads", "Заявки с сайта"], ["sales", "Продажи"], ["deals", "Сделки (старая CRM)"], ["client-base", "Клиенты"], ["payments", "Платежи по продажам"], ["leasing-applications", "Заявки на лизинг"]] },
  { title: "Склад и логистика", items: [["inventory-units", "Техника и запчасти"], ["purchases", "Заказы заводу"], ["shipments", "Поставки"], ["suppliers", "Поставщики"], ["service-cases", "Сервис и гарантия"]] },
  { title: "Финансы", items: [["finance", "Финансы"], ["financial-accounts", "Кассы и счета"], ["expenses", "Расходы"], ["debts", "Долги"], ["payroll", "Зарплаты"], ["documents", "Документы"]] },
  { title: "Маркетинг", items: [["catalog", "Каталог техники и запчастей"], ["news", "Публикации"], ["promotions", "Акции"], ["leasing", "Программы лизинга"], ["leasing-models", "Лизинг по моделям"], ["faq", "Частые вопросы"], ["public-service", "Страницы сервиса"], ["site-settings", "Контакты сайта"], ["site-analytics", "Аналитика сайта"]] },
  { title: "Прочее", items: [["meetings", "Встречи"], ["employee-tasks", "Задачи"], ["notifications", "Уведомления"], ["chat", "Чат"], ["groups", "Группы"], ["team", "Сотрудники (просмотр)"], ["audit", "Журнал действий"]] },
];

const cleanPerms = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is PermissionSection => typeof x === "string" && (permissionSections as readonly string[]).includes(x)) : []);
async function origin() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "atadan.kg";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}
const token = () => Array.from(crypto.getRandomValues(new Uint8Array(32)), (b) => b.toString(16).padStart(2, "0")).join("");

export type StaffRow = { id: string; email: string; display_name: string; role: StaffRole; active: number; phone: string; position: string; avatar: string | null; permissions: PermissionSection[] | null; last_seen: string | null; sessions: number; open_sales: number; open_leads: number };

export async function listTeam() {
  const db = getRawDb();
  const [staff, invites] = await Promise.all([
    db.prepare(`SELECT s.id, s.email, s.display_name, s.role, s.active, s.phone, s.position, s.avatar, s.permissions_json,
        (SELECT MAX(created_at)::text FROM auth_events e WHERE e.staff_id=s.id AND e.event_type='login_success') AS last_seen,
        (SELECT COUNT(*)::int FROM staff_sessions x WHERE x.staff_id=s.id) AS sessions,
        (SELECT COUNT(*)::int FROM sale_orders o WHERE o.manager_id=s.id AND o.status='booked') AS open_sales,
        (SELECT COUNT(*)::int FROM leads l WHERE l.assigned_to=s.id AND l.status IN ('new','contacted')) AS open_leads
      FROM staff s WHERE s.active>=0 ORDER BY CASE s.role WHEN 'owner' THEN 0 WHEN 'director' THEN 1 ELSE 2 END, s.active DESC, s.display_name`).all<Omit<StaffRow, "permissions"> & { permissions_json: string }>(),
    db.prepare(`SELECT i.token_hash AS id, i.email, i.role, i.expires_at, s.display_name AS author FROM staff_invites i LEFT JOIN staff s ON s.id=i.created_by
      WHERE i.used_at IS NULL AND i.revoked=0 AND i.expires_at > ? ORDER BY i.expires_at DESC`).bind(Math.floor(Date.now() / 1000)).all<{ id: string; email: string; role: string; expires_at: number; author: string | null }>(),
  ]);
  return {
    staff: staff.results.map(({ permissions_json, ...r }) => {
      let permissions: PermissionSection[] | null = null;
      try { const p = JSON.parse(permissions_json); if (Array.isArray(p)) permissions = cleanPerms(p); } catch { permissions = null; }
      return { ...r, permissions };
    }),
    invites: invites.results,
  };
}

export async function invite(actor: Actor, input: { email: string; role: string; permissions: string[] }) {
  if (!canTeam(actor)) throw new HttpError(403, "Приглашать могут владелец и директор");
  const email = text(input.email, 200).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new HttpError(400, "Укажите email сотрудника");
  if (!["manager", "accountant", "marketer"].includes(input.role)) throw new HttpError(400, "Выберите роль");
  const perms = cleanPerms(input.permissions);
  const raw = token(), hash = await digest(raw), expires = Math.floor(Date.now() / 1000) + 86400;
  await getRawDb().transaction(async (client) => {
    const q = query(client);
    if ((await q("SELECT 1 FROM staff WHERE lower(email)=?", email)).length) throw new HttpError(409, "Сотрудник с таким email уже есть");
    await q("UPDATE staff_invites SET revoked=1 WHERE email=? AND used_at IS NULL", email);
    await q("INSERT INTO staff_invites(token_hash,email,created_by,role,permissions_json,expires_at) VALUES(?,?,?,?,?,?)", hash, email, actor.id, input.role, JSON.stringify(perms), expires);
    await audit(q, actor, "Создано приглашение", email, `Роль: ${input.role}; разделов: ${perms.length}`);
  });
  // токен в #фрагменте: не попадает в логи сервера и заголовок Referer
  return { url: `${await origin()}/admin/join#${raw}`, expiresAt: new Date(expires * 1000).toISOString() };
}

export async function revokeInvite(actor: Actor, hash: string) {
  if (!canTeam(actor)) throw new HttpError(403, "Нет доступа");
  await getRawDb().transaction(async (client) => {
    const q = query(client);
    const [i] = await q<{ email: string }>("UPDATE staff_invites SET revoked=1 WHERE token_hash=? AND used_at IS NULL RETURNING email", text(hash, 200));
    if (!i) throw new HttpError(404, "Приглашение уже использовано или отозвано");
    await audit(q, actor, "Приглашение отозвано", i.email, "");
  });
}

async function target(q: ReturnType<typeof query>, actor: Actor, id: string) {
  const [t] = await q<{ id: string; role: StaffRole; email: string; display_name: string; active: number }>("SELECT id, role, email, display_name, active FROM staff WHERE id=? AND active>=0 FOR UPDATE", text(id, 100));
  if (!t) throw new HttpError(404, "Сотрудник не найден");
  if (t.id === actor.id) throw new HttpError(400, "Себя так менять нельзя");
  if (t.role === "owner" || t.role === "director") throw new HttpError(400, "Владельца и директора здесь не меняют");
  return t;
}

export async function setPermissions(actor: Actor, id: string, permissions: string[]) {
  if (!canTeam(actor)) throw new HttpError(403, "Нет доступа");
  const perms = cleanPerms(permissions);
  await getRawDb().transaction(async (client) => {
    const q = query(client);
    const t = await target(q, actor, id);
    await q("UPDATE staff SET permissions_json=? WHERE id=?", JSON.stringify(perms), t.id);
    await q("DELETE FROM staff_sessions WHERE staff_id=?", t.id);
    await audit(q, actor, "staff_permissions", t.id, `${t.display_name}: разделов ${perms.length}`);
  });
}

export async function setRole(actor: Actor, id: string, role: string) {
  if (!canTeam(actor)) throw new HttpError(403, "Нет доступа");
  if (!["manager", "accountant", "marketer"].includes(role)) throw new HttpError(400, "Выберите роль");
  await getRawDb().transaction(async (client) => {
    const q = query(client);
    const t = await target(q, actor, id);
    if (t.role === role) throw new HttpError(400, "Роль не изменилась");
    await q("UPDATE staff SET role=?, permissions_json=? WHERE id=?", role, JSON.stringify(DEFAULT_PERMS[role as "manager"]), t.id);
    await q("DELETE FROM staff_sessions WHERE staff_id=?", t.id);
    await audit(q, actor, "staff_role", t.id, `${t.display_name}: ${t.role} → ${role}; доступы по умолчанию`);
  });
}

export async function setActive(actor: Actor, id: string, active: boolean, reassignTo: string) {
  if (!canTeam(actor)) throw new HttpError(403, "Нет доступа");
  await getRawDb().transaction(async (client) => {
    const q = query(client);
    const t = await target(q, actor, id);
    let to = actor.id;
    if (!active && reassignTo) {
      const [r] = await q<{ id: string }>("SELECT id FROM staff WHERE id=? AND active=1", text(reassignTo, 100));
      if (!r || r.id === t.id) throw new HttpError(400, "Выберите активного сотрудника, которому передать дела");
      to = r.id;
    }
    if (!active) {
      await q("UPDATE sale_orders SET manager_id=? WHERE manager_id=? AND status='booked'", to, t.id);
      await q("UPDATE leads SET assigned_to=? WHERE assigned_to=? AND status IN ('new','contacted')", to, t.id);
      await q("UPDATE crm_deals SET assigned_to=? WHERE assigned_to=? AND archived=0 AND stage NOT IN ('won','lost')", to, t.id);
      await q("UPDATE crm_customers SET assigned_to=? WHERE assigned_to=? AND archived=0", to, t.id);
      await q("UPDATE crm_tasks SET assigned_to=?, updated_at=CURRENT_TIMESTAMP, version=version+1 WHERE assigned_to=? AND done=0 AND archived=0", to, t.id);
      await q("DELETE FROM staff_sessions WHERE staff_id=?", t.id);
    }
    await q("UPDATE staff SET active=? WHERE id=?", active ? 1 : 0, t.id);
    await audit(q, actor, "staff_active", t.id, active ? `${t.display_name}: разблокирован` : `${t.display_name}: заблокирован, дела переданы ${to}`);
  });
}

export async function resetLink(actor: Actor, id: string) {
  if (!canTeam(actor)) throw new HttpError(403, "Нет доступа");
  const raw = token(), hash = await digest(raw), now = Math.floor(Date.now() / 1000);
  await getRawDb().transaction(async (client) => {
    const q = query(client);
    const [t] = await q<{ id: string; email: string; role: string }>("SELECT id, email, role FROM staff WHERE id=? AND active=1", text(id, 100));
    if (!t) throw new HttpError(404, "Сотрудник не найден или заблокирован");
    if (t.role === "owner" && actor.role !== "owner") throw new HttpError(403, "Доступ владельца восстанавливает только владелец");
    await q("DELETE FROM password_reset_tokens WHERE staff_id=? OR expires_at<?", t.id, now);
    await q("INSERT INTO password_reset_tokens(token_hash,staff_id,expires_at) VALUES(?,?,?)", hash, t.id, now + 1800);
    await audit(q, actor, "Создано восстановление доступа", t.id, t.email);
  });
  return { url: `${await origin()}/admin/reset?token=${raw}` };
}

// ── мой профиль и уведомления
export async function saveProfile(actor: Actor, input: { name: string; phone: string; position: string; avatar: string; bio: string }) {
  const name = text(input.name, 120);
  if (name.length < 2) throw new HttpError(400, "Укажите имя");
  const phone = text(input.phone, 40);
  if (phone && !/^\+?[\d\s()-]{6,40}$/.test(phone)) throw new HttpError(400, "Проверьте телефон");
  const avatar = text(input.avatar, 2000);
  if (avatar && !/^(\/api\/media\/|https:\/\/)/.test(avatar)) throw new HttpError(400, "Загрузите фото");
  await getRawDb().transaction(async (client) => {
    const q = query(client);
    await q("UPDATE staff SET display_name=?, phone=?, position=?, avatar=?, bio=? WHERE id=?", name, phone, text(input.position, 120), avatar || null, text(input.bio, 2000), actor.id);
    await audit(q, actor, "profile.update", actor.id, name);
  });
}

export const NOTIFY_KEYS: { key: string; label: string; hint: string; roles?: StaffRole[] }[] = [
  { key: "leads", label: "Новые заявки с сайта", hint: "Сразу, как клиент оставил заявку" },
  { key: "payments", label: "Оплаты по моим продажам", hint: "Когда бухгалтер или касса провели оплату по вашей продаже" },
  { key: "approvals", label: "Нужно согласование", hint: "Цена ниже себестоимости, выдача в рассрочку", roles: ["owner", "director"] },
  { key: "logistics", label: "Поставки", hint: "Поставка опаздывает, недостача при приёмке" },
  { key: "parts", label: "Запчасти заканчиваются", hint: "Остаток ниже минимального" },
];

export async function notifyPrefs(actor: Actor): Promise<Record<string, boolean>> {
  const row = await getRawDb().prepare("SELECT notify_json FROM staff WHERE id=?").bind(actor.id).first<{ notify_json: string }>();
  let saved: Record<string, boolean> = {};
  try { saved = JSON.parse(row?.notify_json || "{}"); } catch { saved = {}; }
  return Object.fromEntries(NOTIFY_KEYS.map((k) => [k.key, saved[k.key] !== false]));
}

export async function saveNotifyPrefs(actor: Actor, prefs: Record<string, boolean>) {
  const clean = Object.fromEntries(NOTIFY_KEYS.map((k) => [k.key, prefs[k.key] !== false]));
  await getRawDb().prepare("UPDATE staff SET notify_json=? WHERE id=?").bind(JSON.stringify(clean), actor.id).run();
}

