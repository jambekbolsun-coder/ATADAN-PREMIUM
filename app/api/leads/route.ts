import { ensureDb, getRawDb } from "../../../db";
import { getCatalog } from "../../lib/catalog";
import { cleanText, digest, fail, HttpError, jsonBody, rateLimit, sameOrigin } from "../../lib/security";

export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const body = await jsonBody(request, 12_000);
    if (body.website) return Response.json({ ok: true }, { status: 201 });
    const name = cleanText(body.name, 120, true);
    const phone = cleanText(body.phone, 40, true);
    const message = cleanText(body.message ?? "", 1000);
    if (body.consent !== true) throw new HttpError(400, "Необходимо согласие на обработку персональных данных");
    const consentVersion = cleanText(body.consentVersion ?? "", 40, true);
    const consentAt = cleanText(body.consentedAt ?? "", 40, true);
    const sourcePath = cleanText(body.sourcePath ?? "/", 300, true);
    if (!/^\d{4}-\d{2}-\d{2}T/.test(consentAt)) throw new HttpError(400, "Некорректная отметка согласия");
    if (name.length < 2 || phone.replace(/\D/g, "").length < 8) throw new HttpError(400, "Укажите имя и корректный номер телефона");
    await ensureDb();
    const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0] ?? "local";
    await rateLimit(`lead:${forwarded}`, 8, 900);

    const catalog = await getCatalog();
    const requestedSlug = cleanText(body.tractorSlug ?? "", 120);
    const tractor = requestedSlug ? catalog.find((item) => item.slug === requestedSlug) : undefined;
    if (requestedSlug && !tractor) throw new HttpError(400, "Выбранная модель не найдена");

    const clientKey = cleanText(request.headers.get("idempotency-key") ?? "", 100, true);
    const requestId = await digest(`lead-request:${clientKey}`);
    const payloadHash = await digest(JSON.stringify({ name, phone, message, slug: tractor?.slug ?? "", consentVersion }));
    const db = getRawDb();
    const previous = await db.prepare("SELECT payload_hash,lead_id FROM lead_requests WHERE id=?").bind(requestId).first<{payload_hash:string;lead_id:string}>();
    if (previous) {
      if (previous.payload_hash !== payloadHash) throw new HttpError(409, "Эта заявка уже была отправлена с другими данными");
      return Response.json({ id: previous.lead_id, duplicate: true }, { status: 200 });
    }

    const leadId = crypto.randomUUID();
    const customerId = crypto.randomUUID();
    const dealId = crypto.randomUUID();
    const assignee = await db.prepare("SELECT id FROM staff WHERE role='owner' AND active=1 ORDER BY created_at LIMIT 1").first<{id:string}>();
    const priceMinor = tractor?.price ? Math.round(tractor.price * (1 - (tractor.discountPercent ?? 0) / 100) * 100) : 0;
    const cost = tractor ? await db.prepare("SELECT cost_minor FROM product_costs WHERE slug=?").bind(tractor.slug).first<{cost_minor:number}>() : null;
    try {
      await db.batch([
        db.prepare("INSERT INTO leads(id,tractor_slug,tractor_model,name,phone,message,source,consent_version,consent_at,source_path) VALUES(?,?,?,?,?,?,'website',?,?,?)").bind(leadId, tractor?.slug ?? null, tractor?.model ?? null, name, phone, message, consentVersion, consentAt, sourcePath),
        db.prepare("INSERT INTO crm_customers(id,name,phone,notes,assigned_to) VALUES(?,?,?,?,?)").bind(customerId, name, phone, message, assignee?.id ?? null),
        db.prepare("INSERT INTO crm_deals(id,lead_id,customer_id,title,tractor_slug,amount_minor,cost_minor,assigned_to) VALUES(?,?,?,?,?,?,?,?)").bind(dealId, leadId, customerId, tractor ? `Заявка: Changfa ${tractor.model}` : "Подбор трактора Changfa", tractor?.slug ?? null, priceMinor, cost?.cost_minor ?? null, assignee?.id ?? null),
        db.prepare("INSERT INTO lead_requests(id,payload_hash,lead_id) VALUES(?,?,?)").bind(requestId, payloadHash, leadId),
      ]);
    } catch (error) {
      const raced = await db.prepare("SELECT payload_hash,lead_id FROM lead_requests WHERE id=?").bind(requestId).first<{payload_hash:string;lead_id:string}>();
      if (raced?.payload_hash === payloadHash) return Response.json({ id: raced.lead_id, duplicate: true }, { status: 200 });
      throw error;
    }
    return Response.json({ id: leadId, dealId }, { status: 201 });
  } catch (error) {
    return fail(error);
  }
}
