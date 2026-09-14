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
