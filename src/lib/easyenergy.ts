import type { PricePoint } from "./types";

const BASE_URL = "https://mijn.easyenergy.com/nl/api/tariff";

/**
 * easyEnergy publiceert de day-ahead EPEX (stroom) en EEX/LEBA (gas)
 * tarieven zonder API-key. Het veld heet historisch "TariffUsage" en is de
 * kale marktprijs excl. BTW, excl. energiebelasting en excl. leveranciersopslag.
 * We parsen defensief omdat dit een ongedocumenteerde publieke API is.
 */
interface RawTariff {
  Timestamp?: string;
  timestamp?: string;
  TariffUsage?: number;
  tariffUsage?: number;
}

function normalize(raw: unknown): PricePoint[] {
  if (!Array.isArray(raw)) {
    throw new Error("Onverwacht antwoordformaat van easyEnergy (geen array).");
  }

  const points: PricePoint[] = [];
  for (const entry of raw as RawTariff[]) {
    const timestamp = entry.Timestamp ?? entry.timestamp;
    const price = entry.TariffUsage ?? entry.tariffUsage;
    if (typeof timestamp !== "string" || typeof price !== "number") continue;
    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) continue;
    points.push({ timestamp: date.toISOString(), priceExVat: price });
  }

  points.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  return points;
}

async function fetchTariffs(endpoint: "getapxtariffs" | "getlebatariffs", start: Date, end: Date): Promise<PricePoint[]> {
  const url = `${BASE_URL}/${endpoint}?startTimestamp=${encodeURIComponent(start.toISOString())}&endTimestamp=${encodeURIComponent(end.toISOString())}`;

  const res = await fetch(url, {
    headers: { Accept: "application/json" },
    next: { revalidate: 300 },
  });

  if (!res.ok) {
    throw new Error(`easyEnergy antwoordde met status ${res.status} (${endpoint}).`);
  }

  const data = await res.json();
  return normalize(data);
}

/** Uurlijkse day-ahead stroomprijzen (EPEX), excl. BTW/belasting/opslag. */
export function fetchElectricityPrices(start: Date, end: Date) {
  return fetchTariffs("getapxtariffs", start, end);
}

/** Dagelijkse gasprijzen (EEX/LEBA), excl. BTW/belasting/opslag. */
export function fetchGasPrices(start: Date, end: Date) {
  return fetchTariffs("getlebatariffs", start, end);
}
