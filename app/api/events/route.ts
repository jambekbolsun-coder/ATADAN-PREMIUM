import { ensureDb, getRawDb } from "../../../db";

export async function POST(request: Request) {
  try {
    const body = await request.json() as { path?: string; tractorSlug?: string; eventType?: string; visitorId?: string };
    const path = body.path?.slice(0, 300) ?? "/";
    const eventType = body.eventType?.slice(0, 40) ?? "page_view";
    await ensureDb();
    await getRawDb().prepare(
      "INSERT INTO interest_events (id, tractor_slug, path, event_type, visitor_id) VALUES (?, ?, ?, ?, ?)",
    ).bind(crypto.randomUUID(), body.tractorSlug ?? null, path, eventType, body.visitorId?.slice(0, 80) ?? null).run();
    return new Response(null, { status: 204 });
  } catch {
    return new Response(null, { status: 204 });
  }
}
