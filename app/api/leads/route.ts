import { regions, validPublicPhone } from "../../lib/customer-input";
import { ensureDb, getRawDb } from "../../../db";
import { getCatalog } from "../../lib/catalog";
import { cleanText, digest, fail, HttpError, jsonBody, rateLimit, sameOrigin } from "../../lib/security";
import { normalizePhone } from "../../lib/business";

export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const body = await jsonBody(request, 12_000);
    if (body.website) return Response.json({ ok: true }, { status: 201 });
    const name = cleanText(body.name, 120, true);
    const phone = cleanText(body.phone, 40, true);
    const normalizedPhone = normalizePhone(phone);
    const message = cleanText(body.message ?? "", 1000);
    const region=cleanText(body.region??"",80);
    if(region&&!regions.some(item=>item===region))throw new HttpError(400,"Выберите регион Кыргызстана");
    if (body.consent !== true) throw new HttpError(400, "Необходимо согласие на обработку персональных данных");
    const consentVersion = cleanText(body.consentVersion ?? "", 40, true);
    const consentAt = cleanText(body.consentedAt ?? "", 40, true);
    const sourcePath = cleanText(body.sourcePath ?? "/", 300, true);
    const utmSource = cleanText(body.utmSource ?? "", 120);
    const utmMedium = cleanText(body.utmMedium ?? "", 120);
    const utmCampaign = cleanText(body.utmCampaign ?? "", 120);
    const utmContent = cleanText(body.utmContent ?? "", 120);
    const utmTerm = cleanText(body.utmTerm ?? "", 120);
    if (!/^\d{4}-\d{2}-\d{2}T/.test(consentAt)) throw new HttpError(400, "Некорректная отметка согласия");
    if (name.length < 2 || !validPublicPhone(phone)) throw new HttpError(400, "Укажите имя и корректный номер телефона");
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
    const proposedCustomerId = crypto.randomUUID();
    const dealId = crypto.randomUUID();
    const assignee = await db.prepare("SELECT id FROM staff WHERE role='owner' AND active=1 ORDER BY created_at LIMIT 1").first<{id:string}>();
    const priceMinor = tractor?.price ? Math.round(tractor.price * (1 - (tractor.discountPercent ?? 0) / 100) * 100) : 0;
    const cost = tractor ? await db.prepare("SELECT cost_minor FROM product_costs WHERE slug=?").bind(tractor.slug).first<{cost_minor:number}>() : null;
    try {
      await db.transaction(async (client) => {
        const customerResult = await db.prepare(`INSERT INTO crm_customers(id,name,phone,normalized_phone,notes,region,source,tractor_slug,assigned_to)
          VALUES(?,?,?,?,?,?,'website',?,?) ON CONFLICT(normalized_phone) WHERE normalized_phone IS NOT NULL AND normalized_phone<>'' AND archived=0
          DO UPDATE SET name=CASE WHEN crm_customers.name='' THEN excluded.name ELSE crm_customers.name END,phone=excluded.phone,region=CASE WHEN excluded.region<>'' THEN excluded.region ELSE crm_customers.region END,updated_at=CURRENT_TIMESTAMP,version=crm_customers.version+1
          RETURNING id`).bind(proposedCustomerId,name,phone,normalizedPhone,message,region,tractor?.slug??null,assignee?.id??null).execute<{id:string}>(client);
        const customerId=customerResult.results[0]?.id;
        if(!customerId)throw new HttpError(500,"Не удалось связать клиента");
        const statements = [
          db.prepare("INSERT INTO leads(id,tractor_slug,tractor_model,name,phone,normalized_phone,customer_id,message,source,consent_version,consent_at,source_path,utm_source,utm_medium,utm_campaign,utm_content,utm_term) VALUES(?,?,?,?,?,?,?,?,'website',?,?,?,?,?,?,?,?)").bind(leadId, tractor?.slug ?? null, tractor?.model ?? null, name, phone, normalizedPhone, customerId, message, consentVersion, consentAt, sourcePath, utmSource, utmMedium, utmCampaign, utmContent, utmTerm),
          db.prepare("INSERT INTO crm_deals(id,lead_id,customer_id,title,tractor_slug,amount_minor,cost_minor,assigned_to) VALUES(?,?,?,?,?,?,?,?)").bind(dealId, leadId, customerId, tractor ? `Заявка: Changfa ${tractor.model}` : "Подбор трактора Changfa", tractor?.slug ?? null, priceMinor, cost?.cost_minor ?? null, assignee?.id ?? null),
          db.prepare("INSERT INTO lead_requests(id,payload_hash,lead_id) VALUES(?,?,?)").bind(requestId, payloadHash, leadId),
        ];
        if(assignee?.id){
          const due=new Date(Date.now()+30*60_000).toISOString();
          statements.push(db.prepare("INSERT INTO crm_tasks(id,deal_id,customer_id,title,description,priority,assigned_to,due_at) VALUES(?,?,?,'Связаться с новым лидом','Новая заявка с публичного сайта','high',?,?)").bind(crypto.randomUUID(),dealId,customerId,assignee.id,due));
          statements.push(db.prepare("INSERT INTO notifications_v2(id,recipient_id,type,priority,title,body,entity_type,entity_id,target_url) VALUES(?,?,'new_lead','high',?,?,'deal',?,'/admin/company/deals')").bind(crypto.randomUUID(),assignee.id,`Новый лид: ${name}`,phone,dealId));
        }
        for (const statement of statements) await statement.execute(client);
      });
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
