import { EnphaseConfigError, fetchCurrentPowerW, fetchSolarDay, fetchSolarProduction } from "@/lib/enphase";
import { localDateKey } from "@/lib/priceUtils";
import type { SolarPoint, SolarResponse } from "@/lib/types";

// Enphase's gratis "Watt"-abonnement heeft een beperkt aantal verzoeken per
// minuut/maand (HTTP 429 bij overschrijding); we cachen daarom in het geheugen,
// ook als Next.js zelf niet cachet (bv. in dev).
export const revalidate = 900;

const CACHE_TTL_MS = 15 * 60 * 1000;

let cachedResponse: { body: SolarResponse; at: number } | null = null;
// Een voorbije dag verandert niet meer: per datum slechts één keer ophalen.
const pastDayCache = new Map<string, SolarPoint[]>();

export async function GET() {
  const now = new Date();
  if (cachedResponse && now.getTime() - cachedResponse.at < CACHE_TTL_MS) {
    return Response.json(cachedResponse.body);
  }

  const start = new Date(now.getTime() - 24 * 3600 * 1000);
  const lastWeek = new Date(now.getTime() - 7 * 24 * 3600 * 1000);
  const lastWeekKey = localDateKey(lastWeek.toISOString());

  try {
    // Sequentieel i.p.v. parallel: spaart de verzoeken-per-minuut-limiet.
    const points = await fetchSolarProduction(start, now);
    const currentPowerW = await fetchCurrentPowerW();

    let lastWeekPoints = pastDayCache.get(lastWeekKey);
    if (!lastWeekPoints) {
      // Vorige week zelfde dag: een fout hier mag de rest niet breken.
      lastWeekPoints = await fetchSolarDay(lastWeek).catch(() => undefined);
      if (lastWeekPoints) pastDayCache.set(lastWeekKey, lastWeekPoints);
    }

    const body: SolarResponse = {
      points,
      lastWeekPoints: lastWeekPoints ?? [],
      currentPowerW,
      source: "Enphase Enlighten API (production_micro)",
      fetchedAt: new Date().toISOString(),
    };
    cachedResponse = { body, at: now.getTime() };
    return Response.json(body);
  } catch (err) {
    if (err instanceof EnphaseConfigError) {
      return Response.json({ error: err.message, notConfigured: true }, { status: 501 });
    }
    // Liever iets oudere data tonen dan niets (bv. bij 429).
    if (cachedResponse) return Response.json(cachedResponse.body);
    const message = err instanceof Error ? err.message : "Onbekende fout bij ophalen zonnepaneeldata.";
    return Response.json({ error: message }, { status: 502 });
  }
}
