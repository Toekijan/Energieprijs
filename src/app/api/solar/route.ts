import { enphaseConfigured, fetchSolarSummary } from "@/lib/enphase";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!enphaseConfigured()) {
    return Response.json({ configured: false });
  }
  try {
    const summary = await fetchSolarSummary();
    return Response.json({ configured: true, ...summary, fetchedAt: new Date().toISOString() });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Onbekende fout bij ophalen opwek.";
    return Response.json({ configured: true, error: message }, { status: 502 });
  }
}
