import { getCatalog } from "../../lib/catalog";

export async function GET() {
  return Response.json({ tractors: await getCatalog() }, {
    headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=300" },
  });
}
