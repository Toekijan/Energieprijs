import type { PricePoint, SolarPoint } from "./types";
import { totalPrice, type Surcharge } from "./priceUtils";

const QUARTER_MS = 15 * 60_000;

/**
 * Zet opwekpunten (tijdstip = einde van het interval, 5 of 15 min) om naar kWh per
 * kwartier, met als sleutel het begin van het kwartier in ms — gelijk aan de
 * tijdstempels van de stroomprijzen.
 */
export function solarKwhPerQuarter(points: SolarPoint[]): Map<number, number> {
  const buckets = new Map<number, number>();
  for (const p of points) {
    const start = Math.floor((new Date(p.timestamp).getTime() - 1) / QUARTER_MS) * QUARTER_MS;
    buckets.set(start, (buckets.get(start) ?? 0) + p.energyWh / 1000);
  }
  return buckets;
}

/** Waarde (€) van de opwek: kWh per kwartier × terugleverprijs (€/kWh) van datzelfde kwartier. */
export function feedInValueEur(kwhPerQuarter: Map<number, number>, todayPrices: PricePoint[], feedIn: Surcharge): number {
  let sum = 0;
  for (const p of todayPrices) {
    const kwh = kwhPerQuarter.get(new Date(p.timestamp).getTime());
    if (kwh) sum += kwh * totalPrice(p, feedIn);
  }
  return sum;
}
