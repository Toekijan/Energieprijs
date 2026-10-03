import { EnphaseConfigError, fetchCurrentPowerW, fetchSolarProduction } from "@/lib/enphase";

// Enphase's gratis "Watt"-abonnement heeft een beperkt aantal verzoeken per
// maand; we cachen daarom ruimer dan bij de prijzen-API's (die geen limiet kennen).
export const revalidate = 900;

export async function GET() {
  const now = new Date();
  const start = new Date(now.getTime() - 24 * 3600 * 1000);

  try {
    const [points, currentPowerW] = await Promise.all([fetchSolarProduction(start, now), fetchCurrentPowerW()]);
    return Response.json({
      points,
      currentPowerW,
      source: "Enphase Enlighten API (production_micro)",
      fetchedAt: new Date().toISOString(),
    });
  } catch (err) {
    if (err instanceof EnphaseConfigError) {
      return Response.json({ error: err.message, notConfigured: true }, { status: 501 });
    }
    const message = err instanceof Error ? err.message : "Onbekende fout bij ophalen zonnepaneeldata.";
    return Response.json({ error: message }, { status: 502 });
  }
}
