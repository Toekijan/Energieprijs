export interface PricePoint {
  /** ISO-8601 tijdstip in UTC, begin van het uur (stroom) of de dag (gas). */
  timestamp: string;
  /** Kale marktprijs excl. BTW en excl. leveranciersopslag/energiebelasting, in euro per kWh (stroom) of per m3 (gas). */
  priceExVat: number;
}

export interface PricesResponse {
  points: PricePoint[];
  source: string;
  fetchedAt: string;
}

export interface PricesError {
  error: string;
}

export interface SolarPoint {
  /** ISO-8601 tijdstip in UTC, einde van het kwartier. */
  timestamp: string;
  /** Gemiddeld vermogen in dat kwartier, in watt. */
  powerW: number;
  /** Opgewekte energie in dat kwartier, in watt-uur. */
  energyWh: number;
}

export interface SolarResponse {
  points: SolarPoint[];
  /** Huidig vermogen (W) zoals gerapporteerd door de Enphase-summary, indien beschikbaar. */
  currentPowerW: number | null;
  source: string;
  fetchedAt: string;
}
