"use client";

import type { PricePoint } from "@/lib/types";
import { average, formatEurCents, inferIntervalMinutes, localTimeLabel, totalPrice, type Surcharge } from "@/lib/priceUtils";
import { Card } from "./Card";

export function CurrentElectricityCard({
  current,
  todayPoints,
  consumptionSurcharge,
  feedInSurcharge,
}: {
  current: PricePoint | null;
  todayPoints: PricePoint[];
  consumptionSurcharge: Surcharge;
  feedInSurcharge: Surcharge;
}) {
  if (!current) {
    return (
      <Card title="Huidige stroomprijs">
        <p className="text-sm text-black/50 dark:text-white/50">Geen actueel prijspunt beschikbaar.</p>
      </Card>
    );
  }

  const dayAvgExVat = average(todayPoints);
  const price = totalPrice(current, consumptionSurcharge);
  const feedInPrice = totalPrice(current, feedInSurcharge);
  const dayAvg = dayAvgExVat !== null ? totalPrice({ timestamp: current.timestamp, priceExVat: dayAvgExVat }, consumptionSurcharge) : null;
  const diffPct = dayAvg ? ((price - dayAvg) / dayAvg) * 100 : null;

  const status = diffPct === null ? null : diffPct <= -10 ? { label: "Voordelig", color: "text-emerald-600 dark:text-emerald-400" } : diffPct >= 10 ? { label: "Duur", color: "text-red-600 dark:text-red-400" } : { label: "Gemiddeld", color: "text-amber-600 dark:text-amber-400" };

  const intervalLabel = inferIntervalMinutes(todayPoints) < 60 ? "Kwartier" : "Uur";

  return (
    <Card title="Huidige stroomprijs" subtitle={`${intervalLabel} ${localTimeLabel(current.timestamp)}`}>
      <div className="flex items-baseline gap-2">
        <span className="text-4xl font-bold tabular-nums">{formatEurCents(price)}</span>
        <span className="text-sm text-black/50 dark:text-white/50">/ kWh</span>
      </div>
      <p className="mt-0.5 text-xs text-black/40 dark:text-white/40">Afneemprijs (all-in)</p>
      {status && (
        <p className={`mt-2 text-sm font-medium ${status.color}`}>
          {status.label} — {diffPct !== null && diffPct > 0 ? "+" : ""}
          {diffPct?.toFixed(0)}% t.o.v. daggemiddelde
        </p>
      )}

      <div className="mt-3 flex items-baseline gap-2 border-t border-black/5 pt-3 dark:border-white/5">
        <span className="text-lg font-semibold tabular-nums">{formatEurCents(feedInPrice)}</span>
        <span className="text-sm text-black/50 dark:text-white/50">/ kWh — terugleverprijs</span>
      </div>

      <p className="mt-3 text-xs text-black/40 dark:text-white/40">Kale marktprijs {formatEurCents(current.priceExVat)}/kWh, incl. jouw opslag, energiebelasting en BTW uit Instellingen.</p>
    </Card>
  );
}
