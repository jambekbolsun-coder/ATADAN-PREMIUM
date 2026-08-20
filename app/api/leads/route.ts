import { ensureDb, getRawDb } from "../../../db";

type LeadPayload = {
  name?: string;
  phone?: string;
  message?: string;
  tractorSlug?: string;
  tractorModel?: string;
};

export async function POST(request: Request) {
  try {
    const body = await request.json() as LeadPayload;
    const name = body.name?.trim().slice(0, 120) ?? "";
    const phone = body.phone?.trim().slice(0, 40) ?? "";
    const message = body.message?.trim().slice(0, 1000) ?? "";
    if (name.length < 2 || phone.replace(/\D/g, "").length < 8) {
      return Response.json({ error: "Укажите имя и корректный номер телефона" }, { status: 400 });
    }
    await ensureDb();
    const id = crypto.randomUUID();
    await getRawDb().prepare(
      `INSERT INTO leads (id, tractor_slug, tractor_model, name, phone, message)
       VALUES (?, ?, ?, ?, ?, ?)`,
    ).bind(id, body.tractorSlug ?? null, body.tractorModel ?? null, name, phone, message).run();
    return Response.json({ id }, { status: 201 });
  } catch {
    return Response.json({ error: "Не удалось сохранить заявку. Позвоните нам — мы уже на связи." }, { status: 500 });
  }
}
