/**
 * Ежедневные напоминания. Вызывает Vercel Cron (vercel.json, 02:00 UTC = 08:00 Бишкек).
 * Если в Vercel задан CRON_SECRET, Vercel передаёт его в Authorization и без него запуск отклоняется.
 * Без секрета вызов тоже безопасен: задача идемпотентна (один раз в день) и не отдаёт данных наружу.
 */
import { runDaily } from "../../../admin/_lib/reminders";
import { ensureDb } from "../../../../db";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) return Response.json({ error: "unauthorized" }, { status: 401 });
  try {
    await ensureDb();
    const result = await runDaily();
    return Response.json({ ok: true, ran: !result.skipped });
  } catch (error) {
    console.error("[cron/daily] failed", error);
    return Response.json({ ok: false }, { status: 500 });
  }
}
