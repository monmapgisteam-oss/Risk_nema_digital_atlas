import { loadManifest } from "@/lib/portal";

/** Atlas maps read from the portal (its search API has no CORS for this site). */
export async function GET() {
  try {
    return Response.json(await loadManifest());
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 502 });
  }
}
