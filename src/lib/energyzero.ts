import type { PricePoint } from "./types";
import { localDateKey } from "./priceUtils";

const BASE_URL = "https://api.energyzero.nl/v1/energyprices";

/**
 * EnergyZero (onderdeel van Eneco) publiceert de day-ahead EPEX (stroom) en
 * gasprijzen zonder API-key. usageType 1 = stroom, 3 = gas. We vragen
 * inclBtw=false op zodat we de kale marktprijs terugkrijgen, excl. BTW,
 * excl. energiebelasting en excl. leveranciersopslag.
 *
 * interval bepaalt de granulariteit: 3 = kwartierprijzen (alleen stroom;
 * sinds 1 januari 2026 de marktstandaard i.p.v. uurprijzen), 4 = uurprijzen.
 * Gas kent geen kwartierprijzen, dus daar gebruiken we interval 4 en
 * dedupliceren we hieronder naar één punt per dag.
 *
 * easyEnergy's publieke tarieven-API (voorheen gebruikt door deze app) is
 * sinds mei 2026 volledig uit de lucht: easyEnergy is overgestapt op een
 * mobiele app en biedt geen open API meer aan.
 */
interface RawPrice {
  readingDate?: string;
  price?: number;
}

interface RawResponse {
  Prices?: RawPrice[];
}

function normalize(raw: unknown): PricePoint[] {
  const prices = (raw as RawResponse)?.Prices;
  if (!Array.isArray(prices)) {
    throw new Error("Onverwacht antwoordformaat van EnergyZero (geen Prices-array).");
  }

  const points: PricePoint[] = [];
  for (const entry of prices) {
    const timestamp = entry.readingDate;
    const price = entry.price;
    if (typeof timestamp !== "string" || typeof price !== "number") continue;
    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) continue;
    points.push({ timestamp: date.toISOString(), priceExVat: price });
  }

  points.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  return points;
}

async function fetchPrices(usageType: 1 | 3, interval: 3 | 4, start: Date, end: Date): Promise<PricePoint[]> {
  const params = new URLSearchParams({
    fromDate: start.toISOString(),
    tillDate: end.toISOString(),
    interval: String(interval),
    usageType: String(usageType),
    inclBtw: "false",
  });
  const url = `${BASE_URL}?${params.toString()}`;

  const res = await fetch(url, {
    headers: { Accept: "application/json" },
    next: { revalidate: 300 },
  });

  if (!res.ok) {
    throw new Error(`EnergyZero antwoordde met status ${res.status} (usageType=${usageType}).`);
  }

  const data = await res.json();
  return normalize(data);
}

/** Kwartierlijkse day-ahead stroomprijzen (EPEX), excl. BTW/belasting/opslag. */
export function fetchElectricityPrices(start: Date, end: Date) {
  return fetchPrices(1, 3, start, end);
}

/**
 * Dagelijkse gasprijzen (day-ahead), excl. BTW/belasting/opslag. EnergyZero
 * levert gas (anders dan stroom) alleen per dag, maar met hetzelfde uurlijkse
 * interval als stroom — elk uur van een dag heeft dezelfde prijs. We houden
 * daarom één punt per kalenderdag over.
 */
export async function fetchGasPrices(start: Date, end: Date): Promise<PricePoint[]> {
  const points = await fetchPrices(3, 4, start, end);
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
