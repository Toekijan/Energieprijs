// Enphase Enlighten API v4 — server-side client met OAuth-refresh.
const API = "https://api.enphaseenergy.com";

export interface SolarSummary {
  currentPowerW: number;
  energyTodayWh: number;
  energyLifetimeWh: number;
  lastReportAt: string | null;
  status: string;
}

export function enphaseConfigured() {
  const e = process.env;
  return Boolean(e.ENPHASE_API_KEY && e.ENPHASE_CLIENT_ID && e.ENPHASE_CLIENT_SECRET && e.ENPHASE_SYSTEM_ID && e.ENPHASE_REFRESH_TOKEN);
}

// Enphase roteert refresh tokens: na elke refresh is de oude ongeldig. We
// houden de nieuwste in geheugen; bij een herstart val je terug op de env.
let refreshToken: string | null = null;
let accessToken: { value: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (accessToken && accessToken.expiresAt > Date.now() + 60_000) return accessToken.value;

  const basic = Buffer.from(`${process.env.ENPHASE_CLIENT_ID}:${process.env.ENPHASE_CLIENT_SECRET}`).toString("base64");
  const rt = refreshToken ?? process.env.ENPHASE_REFRESH_TOKEN!;
  const res = await fetch(`${API}/oauth/token?grant_type=refresh_token&refresh_token=${encodeURIComponent(rt)}`, {
    method: "POST",
    headers: { Authorization: `Basic ${basic}` },
    cache: "no-store",
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body.access_token) {
    throw new Error("Enphase-login mislukt. Draai 'npm run enphase:setup' opnieuw (refresh token verlopen of vervangen).");
  }
  refreshToken = body.refresh_token ?? rt;
  accessToken = { value: body.access_token, expiresAt: Date.now() + (body.expires_in ?? 86400) * 1000 };
  return accessToken.value;
}

export async function fetchSolarSummary(): Promise<SolarSummary> {
  const token = await getAccessToken();
  const res = await fetch(`${API}/api/v4/systems/${process.env.ENPHASE_SYSTEM_ID}/summary?key=${encodeURIComponent(process.env.ENPHASE_API_KEY!)}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Enphase API fout ${res.status}.`);
  const s = await res.json();
  return {
    currentPowerW: s.current_power ?? 0,
    energyTodayWh: s.energy_today ?? 0,
    energyLifetimeWh: s.energy_lifetime ?? 0,
    lastReportAt: s.last_report_at ? new Date(s.last_report_at * 1000).toISOString() : null,
    status: s.status ?? "unknown",
  };
}
