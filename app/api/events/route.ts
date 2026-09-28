import { regions } from "../../lib/customer-input";
import { ensureDb, getRawDb } from "../../../db";
import { cleanText, digest, jsonBody, rateLimit, sameOrigin } from "../../lib/security";

const eventTypes = new Set(["page_view", "model_interest"]);
const visitorPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const body = await jsonBody(request, 4_000);
    const path = cleanText(body.path ?? "/", 300, true);
    const eventType = cleanText(body.eventType ?? "page_view", 40, true);
    const tractorSlug = cleanText(body.tractorSlug ?? "", 120);
    const visitorId = cleanText(body.visitorId ?? "", 80, true);
    if (!path.startsWith("/") || !eventTypes.has(eventType) || !visitorPattern.test(visitorId)) return new Response(null, { status: 204 });
    if (tractorSlug && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(tractorSlug)) return new Response(null, { status: 204 });
    await ensureDb();
    const forwarded=request.headers.get("x-forwarded-for")?.split(",")[0]??"local";
    await rateLimit(`analytics:${forwarded}`,240,900);
    const db=getRawDb(),region=regions.some(item=>item===body.region)?String(body.region):"";
    const day=new Date().toISOString().slice(0,10);
    const eventId=await digest(`analytics:${day}:${visitorId}:${eventType}:${tractorSlug||path}`);
    await db.batch([
      db.prepare("INSERT INTO interest_events (id, tractor_slug, path, event_type, visitor_id, region) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET region=CASE WHEN excluded.region<>'' THEN excluded.region ELSE interest_events.region END,path=excluded.path").bind(eventId, tractorSlug || null, path, eventType, visitorId, region),
      db.prepare("DELETE FROM interest_events WHERE created_at < datetime('now','-395 days')"),
    ]);
    return new Response(null, { status: 204 });
  } catch {
    return new Response(null, { status: 204 });
  }
}
