import type { PricePoint } from "./types";

const TZ = "Europe/Amsterdam";

export interface Surcharge {
  /** Leveranciersopslag + energiebelasting excl. BTW, in euro per kWh of per m3. */
  surchargeExVat: number;
  /** BTW percentage, bv. 21. */
  vatPercent: number;
}

export const DEFAULT_ELECTRICITY_SURCHARGE: Surcharge = { surchargeExVat: 0, vatPercent: 21 };
export const DEFAULT_GAS_SURCHARGE: Surcharge = { surchargeExVat: 0, vatPercent: 21 };

export function totalPrice(point: PricePoint, surcharge: Surcharge): number {
  return (point.priceExVat + surcharge.surchargeExVat) * (1 + surcharge.vatPercent / 100);
}

/** Lokale (Europe/Amsterdam) datumsleutel "YYYY-MM-DD" voor een ISO-timestamp. */
export function localDateKey(isoTimestamp: string): string {
  const d = new Date(isoTimestamp);
  return new Intl.DateTimeFormat("sv-SE", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}

/** Lokaal uur (0-23, Europe/Amsterdam) voor een ISO-timestamp. */
export function localHour(isoTimestamp: string): number {
  const d = new Date(isoTimestamp);
  const part = new Intl.DateTimeFormat("nl-NL", { timeZone: TZ, hour: "2-digit", hour12: false }).formatToParts(d).find((p) => p.type === "hour");
  return part ? parseInt(part.value, 10) % 24 : d.getUTCHours();
}

export function localTimeLabel(isoTimestamp: string): string {
  return new Intl.DateTimeFormat("nl-NL", { timeZone: TZ, hour: "2-digit", minute: "2-digit" }).format(new Date(isoTimestamp));
}

export function localDateLabel(isoTimestamp: string): string {
  return new Intl.DateTimeFormat("nl-NL", { timeZone: TZ, weekday: "short", day: "numeric", month: "short" }).format(new Date(isoTimestamp));
}

export function todayKey(): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

export function tomorrowKey(): string {
  const d = new Date(Date.now() + 24 * 3600 * 1000);
  return new Intl.DateTimeFormat("sv-SE", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}

export function pointsForDate(points: PricePoint[], dateKey: string): PricePoint[] {
  return points.filter((p) => localDateKey(p.timestamp) === dateKey);
}

export function groupByDate(points: PricePoint[]): Map<string, PricePoint[]> {
  const map = new Map<string, PricePoint[]>();
  for (const p of points) {
    const key = localDateKey(p.timestamp);
    const arr = map.get(key);
    if (arr) arr.push(p);
    else map.set(key, [p]);
  }
  return map;
}

export interface Extremum {
  point: PricePoint;
  index: number;
}

export function cheapest(points: PricePoint[]): Extremum | null {
  if (points.length === 0) return null;
  let best = 0;
  for (let i = 1; i < points.length; i++) {
    if (points[i].priceExVat < points[best].priceExVat) best = i;
  }
  return { point: points[best], index: best };
}

export function mostExpensive(points: PricePoint[]): Extremum | null {
  if (points.length === 0) return null;
  let worst = 0;
  for (let i = 1; i < points.length; i++) {
    if (points[i].priceExVat > points[worst].priceExVat) worst = i;
  }
  return { point: points[worst], index: worst };
}

export function average(points: PricePoint[]): number | null {
  if (points.length === 0) return null;
  return points.reduce((sum, p) => sum + p.priceExVat, 0) / points.length;
}

export interface CheapestWindow {
  startIndex: number;
  points: PricePoint[];
  averagePriceExVat: number;
}

/** Vindt het goedkoopste aaneengesloten blok van `hours` uur binnen een dag (chronologisch gesorteerde punten). */
export function cheapestWindow(points: PricePoint[], hours: number): CheapestWindow | null {
  if (points.length === 0 || hours < 1 || hours > points.length) return null;

  let bestStart = 0;
  let bestSum = Infinity;
  for (let start = 0; start + hours <= points.length; start++) {
    let sum = 0;
    for (let i = start; i < start + hours; i++) sum += points[i].priceExVat;
    if (sum < bestSum) {
      bestSum = sum;
      bestStart = start;
    }
  }

  const windowPoints = points.slice(bestStart, bestStart + hours);
  return { startIndex: bestStart, points: windowPoints, averagePriceExVat: bestSum / hours };
}

export function currentPoint(points: PricePoint[]): PricePoint | null {
  const now = Date.now();
  let current: PricePoint | null = null;
  for (const p of points) {
    const t = new Date(p.timestamp).getTime();
    if (t <= now && (current === null || t > new Date(current.timestamp).getTime())) {
      current = p;
    }
  }
  return current;
}

export function formatEurCents(eurPerUnit: number): string {
  return `${(eurPerUnit * 100).toFixed(1)} ct`;
}

export function formatEur(eurPerUnit: number): string {
  return `€ ${eurPerUnit.toFixed(3)}`;
}
