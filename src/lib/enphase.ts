import type { SolarPoint } from "./types";

const TOKEN_URL = "https://api.enphaseenergy.com/oauth/token";
const API_BASE = "https://api.enphaseenergy.com/api/v4";
const TZ = "Europe/Amsterdam";

/**
 * Koppeling met de Enphase Enlighten API (v4) om de opwek van je zonnepanelen
 * op te halen. LET OP: deze module kon niet live getest worden tijdens het
 * schrijven (geen netwerktoegang tot Enphase vanuit de ontwikkelomgeving) —
 * de parsing is daarom extra defensief en gebaseerd op de publieke Enphase-
 * documentatie en community-implementaties. Zie README.md voor de volledige
 * setup (developer-account, OAuth-koppeling via `npm run enphase:setup`).
 *
 * Benodigde env vars: ENPHASE_API_KEY, ENPHASE_CLIENT_ID, ENPHASE_CLIENT_SECRET,
 * ENPHASE_SYSTEM_ID, ENPHASE_REFRESH_TOKEN.
 */

interface TokenCache {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

// Module-level cache: binnen één serverless-instantie hergebruiken we het
// access_token tot kort voor het verloopt, i.p.v. bij elk verzoek te verversen.
let cache: TokenCache | null = null;

export class EnphaseConfigError extends Error {}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new EnphaseConfigError(`${name} ontbreekt. Zie README.md voor de Enphase-setup (npm run enphase:setup).`);
  }
  return value;
}

async function refreshAccessToken(): Promise<TokenCache> {
  const clientId = requireEnv("ENPHASE_CLIENT_ID");
  const clientSecret = requireEnv("ENPHASE_CLIENT_SECRET");
  const refreshToken = cache?.refreshToken ?? requireEnv("ENPHASE_REFRESH_TOKEN");

  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: refreshToken }),
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(
      `Enphase OAuth-refresh mislukt (status ${res.status}). Het refresh_token (geldig ca. 1 maand) is mogelijk verlopen of vervangen — draai npm run enphase:setup opnieuw en update ENPHASE_REFRESH_TOKEN.`
    );
  }

  const body = (await res.json()) as { access_token?: string; refresh_token?: string; expires_in?: number };
  if (!body.access_token) throw new Error("Enphase OAuth-refresh gaf geen access_token terug.");

  // Enphase kan bij elke refresh een nieuw refresh_token teruggeven. We
  // gebruiken dat binnen deze serverinstantie verder, maar kunnen de
  // ENPHASE_REFRESH_TOKEN env var niet automatisch bijwerken — bij een koude
  // start valt de app terug op de oorspronkelijke waarde. Zie README.md.
  if (body.refresh_token && body.refresh_token !== refreshToken) {
    console.warn("[enphase] Nieuw refresh_token ontvangen bij OAuth-refresh. Werk ENPHASE_REFRESH_TOKEN bij als de koppeling later ophoudt te werken.");
  }

  cache = {
    accessToken: body.access_token,
    refreshToken: body.refresh_token ?? refreshToken,
    // Ruime veiligheidsmarge: eerder verversen dan nodig is goedkoper dan een mislukt verzoek.
    expiresAt: Date.now() + Math.max(60, (body.expires_in ?? 3600) - 120) * 1000,
  };
  return cache;
}

async function getAccessToken(): Promise<string> {
  if (cache && cache.expiresAt > Date.now()) return cache.accessToken;
  const fresh = await refreshAccessToken();
  return fresh.accessToken;
}

async function enphaseFetch(path: string, params: Record<string, string>): Promise<unknown> {
  const apiKey = requireEnv("ENPHASE_API_KEY");
  const accessToken = await getAccessToken();
  const query = new URLSearchParams({ ...params, key: apiKey });
  const url = `${API_BASE}${path}?${query.toString()}`;

  let res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` }, cache: "no-store" });

  if (res.status === 401) {
    // Access_token alsnog verlopen/ingetrokken: één keer forceren verversen en opnieuw proberen.
    cache = null;
    const accessToken2 = await getAccessToken();
    res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken2}` }, cache: "no-store" });
  }

  if (!res.ok) {
    throw new Error(`Enphase API antwoordde met status ${res.status} op ${path}.`);
  }

  return res.json();
}

function formatDateParam(d: Date): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}

function localDateParams(start: Date, end: Date): string[] {
  const keys = new Set<string>();
  for (let t = start.getTime(); t <= end.getTime(); t += 24 * 3600 * 1000) {
    keys.add(formatDateParam(new Date(t)));
  }
  keys.add(formatDateParam(end));
  return [...keys];
}

interface RawInterval {
  end_at?: number;
  powr?: number;
  enwh?: number;
}

function normalizeIntervals(raw: unknown): SolarPoint[] {
  const body = raw as { intervals?: RawInterval[]; items?: RawInterval[] };
  const items = body?.intervals ?? body?.items;
  if (!Array.isArray(items)) {
    throw new Error("Onverwacht antwoordformaat van Enphase (geen intervals/items-array).");
  }

  const points: SolarPoint[] = [];
  for (const entry of items) {
    if (typeof entry.end_at !== "number") continue;
    const powerW = typeof entry.powr === "number" ? entry.powr : 0;
    const energyWh = typeof entry.enwh === "number" ? entry.enwh : 0;
    points.push({ timestamp: new Date(entry.end_at * 1000).toISOString(), powerW, energyWh });
  }

  points.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  return points;
}

async function fetchDay(systemId: string, dateKey: string): Promise<SolarPoint[]> {
  try {
    const raw = await enphaseFetch(`/systems/${systemId}/telemetry/production_micro`, { start_date: dateKey, granularity: "day" });
    return normalizeIntervals(raw);
  } catch (err) {
    // Nog geen telemetrie voor vandaag (bv. vlak na middernacht) is geen harde fout.
    if (err instanceof Error && /404/.test(err.message)) return [];
    throw err;
  }
}

/** Kwartierlijkse (of 5-minuten, afhankelijk van je Envoy-configuratie) productietelemetrie, excl. toekomst. */
export async function fetchSolarProduction(start: Date, end: Date): Promise<SolarPoint[]> {
  const systemId = requireEnv("ENPHASE_SYSTEM_ID");
  const dateKeys = localDateParams(start, end);
  const results = await Promise.all(dateKeys.map((key) => fetchDay(systemId, key)));

  const seen = new Set<string>();
  const merged: SolarPoint[] = [];
  for (const point of results.flat()) {
    if (seen.has(point.timestamp)) continue;
    seen.add(point.timestamp);
    const t = new Date(point.timestamp).getTime();
    if (t < start.getTime() || t > end.getTime()) continue;
    merged.push(point);
  }

  merged.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  return merged;
}

/** Huidig vermogen (W) uit de systeemsamenvatting, of null als dat veld ontbreekt. */
export async function fetchCurrentPowerW(): Promise<number | null> {
  const systemId = requireEnv("ENPHASE_SYSTEM_ID");
  const raw = (await enphaseFetch(`/systems/${systemId}/summary`, {})) as { current_power?: number };
  return typeof raw.current_power === "number" ? raw.current_power : null;
}
