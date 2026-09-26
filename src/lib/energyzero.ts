import type { PricePoint } from "./types";
import { localDateKey } from "./priceUtils";

const BASE_URL = "https://public.api.energyzero.nl/public/v1/prices";
const TZ = "Europe/Amsterdam";

/**
 * EnergyZero (onderdeel van Eneco) publiceert de day-ahead EPEX (stroom) en
 * gasprijzen zonder API-key via hun "public" REST-API. Deze API beantwoordt
 * één kalenderdag per verzoek (in de Europe/Amsterdam-tijdzone) en geeft de
 * "base"-reeks terug: de kale marktprijs, excl. BTW, excl. energiebelasting
 * en excl. leveranciersopslag.
 *
 * We vragen daarom per benodigde lokale dag afzonderlijk op en voegen de
 * resultaten samen. INTERVAL_QUARTER geeft kwartierprijzen voor stroom
 * (sinds 1 januari 2026 de marktstandaard i.p.v. uurprijzen); gas kent geen
 * kwartierprijzen en gebruikt INTERVAL_DAY (één blok per gasdag).
 *
 * De oude endpoint (api.energyzero.nl/v1/energyprices, numerieke
 * usageType/interval-parameters) bestaat nog voor uurprijzen, maar heeft
 * geen ondersteuning voor kwartierprijzen — vandaar deze overstap.
 *
 * easyEnergy's publieke tarieven-API (voorheen gebruikt door deze app) is
 * sinds mei 2026 volledig uit de lucht: easyEnergy is overgestapt op een
 * mobiele app en biedt geen open API meer aan.
 */
type EnergyType = "ENERGY_TYPE_ELECTRICITY" | "ENERGY_TYPE_GAS";
type Interval = "INTERVAL_QUARTER" | "INTERVAL_DAY";

interface RawPriceItem {
  start?: string;
  price?: { value?: string | number };
}

interface RawResponse {
  base?: RawPriceItem[];
}

function normalize(raw: unknown): PricePoint[] {
  const items = (raw as RawResponse)?.base;
  if (!Array.isArray(items)) {
    throw new Error("Onverwacht antwoordformaat van EnergyZero (geen base-array).");
  }

  const points: PricePoint[] = [];
  for (const entry of items) {
    const timestamp = entry.start;
    const rawPrice = entry.price?.value;
    if (typeof timestamp !== "string" || rawPrice === undefined) continue;
    const price = typeof rawPrice === "string" ? parseFloat(rawPrice) : rawPrice;
    if (Number.isNaN(price)) continue;
    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) continue;
    points.push({ timestamp: date.toISOString(), priceExVat: price });
  }

  points.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  return points;
}

const BROWSER_HEADERS: HeadersInit = {
  Accept: "application/json",
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
  Referer: "https://www.energyzero.nl/",
  Origin: "https://www.energyzero.nl",
};

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Formatteert een Date als dd-mm-jjjj in de Europe/Amsterdam-tijdzone (verplicht formaat voor deze API). */
function formatDateParam(d: Date): string {
  const parts = new Intl.DateTimeFormat("nl-NL", { timeZone: TZ, day: "2-digit", month: "2-digit", year: "numeric" }).formatToParts(d);
  const day = parts.find((p) => p.type === "day")?.value ?? "01";
  const month = parts.find((p) => p.type === "month")?.value ?? "01";
  const year = parts.find((p) => p.type === "year")?.value ?? "1970";
  return `${day}-${month}-${year}`;
}

/** Alle unieke lokale kalenderdagen (dd-mm-jjjj) die het [start, end]-interval overlappen. */
function localDateParams(start: Date, end: Date): string[] {
  const keys = new Set<string>();
  for (let t = start.getTime(); t <= end.getTime(); t += 24 * 3600 * 1000) {
    keys.add(formatDateParam(new Date(t)));
  }
  keys.add(formatDateParam(end));
  return [...keys];
}

async function fetchDayOnce(energyType: EnergyType, interval: Interval, dateParam: string): Promise<PricePoint[]> {
  const params = new URLSearchParams({ energyType, date: dateParam, interval });
  const url = `${BASE_URL}?${params.toString()}`;

  const res = await fetch(url, { headers: BROWSER_HEADERS, cache: "no-store" });

  if (res.status === 404) {
    // Nog geen prijzen gepubliceerd voor deze dag (bv. morgen vóór ~15:00 uur).
    return [];
  }
  if (!res.ok) {
    throw new Error(`EnergyZero antwoordde met status ${res.status} (${energyType}, ${dateParam}).`);
  }

  const data = await res.json();
  return normalize(data);
}

async function fetchDay(energyType: EnergyType, interval: Interval, dateParam: string): Promise<PricePoint[]> {
  try {
    return await fetchDayOnce(energyType, interval, dateParam);
  } catch {
    await delay(400);
    return fetchDayOnce(energyType, interval, dateParam);
  }
}

async function fetchPrices(energyType: EnergyType, interval: Interval, start: Date, end: Date): Promise<PricePoint[]> {
  const dateParams = localDateParams(start, end);
  const results = await Promise.all(dateParams.map((dateParam) => fetchDay(energyType, interval, dateParam)));

  const seen = new Set<string>();
  const merged: PricePoint[] = [];
  for (const point of results.flat()) {
    if (seen.has(point.timestamp)) continue;
    seen.add(point.timestamp);
    const t = new Date(point.timestamp).getTime();
    if (t < start.getTime() || t >= end.getTime()) continue;
    merged.push(point);
  }

  merged.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  return merged;
}

/** Kwartierlijkse day-ahead stroomprijzen (EPEX), excl. BTW/belasting/opslag. */
export function fetchElectricityPrices(start: Date, end: Date) {
  return fetchPrices("ENERGY_TYPE_ELECTRICITY", "INTERVAL_QUARTER", start, end);
}

/**
 * Dagelijkse gasprijzen (day-ahead), excl. BTW/belasting/opslag. EnergyZero
 * levert gas per gasdag (start ~06:00 lokale tijd) als één blok, dus na het
 * samenvoegen houden we voor de zekerheid nog één punt per kalenderdag over.
 */
export async function fetchGasPrices(start: Date, end: Date): Promise<PricePoint[]> {
  const points = await fetchPrices("ENERGY_TYPE_GAS", "INTERVAL_DAY", start, end);
  const seenDays = new Set<string>();
  const daily: PricePoint[] = [];
  for (const p of points) {
    const key = localDateKey(p.timestamp);
    if (seenDays.has(key)) continue;
    seenDays.add(key);
    daily.push(p);
  }
  return daily;
}
