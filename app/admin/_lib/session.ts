/**
 * Сессия сотрудника в серверных компонентах и действиях новой админки.
 * Использует те же cookie и таблицы, что и API (getActor из admin-auth), поэтому
 * старая и новая админка работают с одним входом.
 */
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { cache } from "react";
import { getActor, type Actor } from "../../lib/admin-auth";
import { canSee, findItem, type NavItem } from "./nav";

async function requestFromHeaders() {
  const h = await headers();
  const host = h.get("x-forwarded-host")?.split(",")[0]?.trim() || h.get("host") || "localhost";
  const local = /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(host);
  const proto = h.get("x-forwarded-proto")?.split(",")[0]?.trim() || (local ? "http" : "https");
  return new Request(`${proto}://${host}/admin`, { headers: h });
}

/** Текущий сотрудник или null. Кэшируется на время одного запроса. */
export const getServerActor = cache(async (): Promise<Actor | null> => {
  return getActor(await requestFromHeaders());
});

/** Сотрудник обязателен: без входа - на страницу входа. */
export async function requireStaff(next = "/admin"): Promise<Actor> {
  const actor = await getServerActor();
  if (!actor) redirect(`/admin/login?next=${encodeURIComponent(next)}`);
  return actor;
}

/**
 * Доступ к разделу по той же карте прав, что и меню.
 * Нет права - 404, чтобы не раскрывать, что раздел существует.
 */
export async function requireSection(href: string): Promise<{ actor: Actor; item: NavItem }> {
  const actor = await requireStaff(href);
  const item = findItem(href);
  if (!item || !canSee(actor, item)) notFound();
  return { actor, item };
}

export function seesCost(actor: Pick<Actor, "role">) {
  return actor.role === "owner" || actor.role === "director" || actor.role === "accountant";
}
