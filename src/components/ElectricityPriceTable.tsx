"use client";

import { useEffect, useMemo, useState } from "react";
import type { PricePoint } from "@/lib/types";
import { cheapest, formatEurCents, inferIntervalMinutes, localTimeLabel, mostExpensive, totalPrice, type Surcharge } from "@/lib/priceUtils";
import { Card } from "./Card";

type SortMode = "time" | "price";
type PriceMode = "consumption" | "feedIn";

export function ElectricityPriceTable({
  todayPoints,
  tomorrowPoints,
  consumptionSurcharge,
  feedInSurcharge,
}: {
  todayPoints: PricePoint[];
  tomorrowPoints: PricePoint[];
  consumptionSurcharge: Surcharge;
  feedInSurcharge: Surcharge;
}) {
  const [day, setDay] = useState<"today" | "tomorrow">("today");
  const [sort, setSort] = useState<SortMode>("time");
  const [mode, setMode] = useState<PriceMode>("consumption");
  const surcharge = mode === "consumption" ? consumptionSurcharge : feedInSurcharge;

  // Alleen gebruikt om de "NU"-rij te markeren; elke minuut is precies genoeg.
  const [nowMs, setNowMs] = useState<number | null>(null);
  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 60_000);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNowMs(Date.now());
    return () => clearInterval(id);
  }, []);

  const points = day === "tomorrow" ? tomorrowPoints : todayPoints;
  const cheapestPoint = cheapest(points);
  const expensivePoint = mostExpensive(points);
  const intervalMs = inferIntervalMinutes(points) * 60_000;

  const rows = useMemo(() => {
    const withTotals = points.map((p) => ({ point: p, price: totalPrice(p, surcharge) }));
    if (sort === "price") withTotals.sort((a, b) => (mode === "feedIn" ? b.price - a.price : a.price - b.price));
    return withTotals;
  }, [points, surcharge, sort, mode]);

  const priceColumnLabel = mode === "consumption" ? "Afneemprijs / kWh" : "Terugleverprijs / kWh";

  return (
    <Card title="Prijzen per kwartier" subtitle="Volledig overzicht van tijdstip en kWh-prijs">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex gap-1 rounded-lg bg-black/5 p-1 dark:bg-white/10">
            <button onClick={() => setDay("today")} className={`rounded-md px-3 py-1 text-sm font-medium transition ${day === "today" ? "bg-white shadow dark:bg-white/20" : "text-black/50 dark:text-white/50"}`}>
              Vandaag
            </button>
            <button onClick={() => setDay("tomorrow")} disabled={tomorrowPoints.length === 0} className={`rounded-md px-3 py-1 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-40 ${day === "tomorrow" ? "bg-white shadow dark:bg-white/20" : "text-black/50 dark:text-white/50"}`}>
              Morgen
            </button>
          </div>
          <div className="flex gap-1 rounded-lg bg-black/5 p-1 dark:bg-white/10">
            <button onClick={() => setMode("consumption")} className={`rounded-md px-3 py-1 text-sm font-medium transition ${mode === "consumption" ? "bg-white shadow dark:bg-white/20" : "text-black/50 dark:text-white/50"}`}>
              Afname
            </button>
            <button onClick={() => setMode("feedIn")} className={`rounded-md px-3 py-1 text-sm font-medium transition ${mode === "feedIn" ? "bg-white shadow dark:bg-white/20" : "text-black/50 dark:text-white/50"}`}>
              Teruglevering
            </button>
          </div>
        </div>

        <div className="flex gap-1 rounded-lg bg-black/5 p-1 dark:bg-white/10">
          <button onClick={() => setSort("time")} className={`rounded-md px-3 py-1 text-sm font-medium transition ${sort === "time" ? "bg-white shadow dark:bg-white/20" : "text-black/50 dark:text-white/50"}`}>
            Op tijd
          </button>
          <button onClick={() => setSort("price")} className={`rounded-md px-3 py-1 text-sm font-medium transition ${sort === "price" ? "bg-white shadow dark:bg-white/20" : "text-black/50 dark:text-white/50"}`}>
            Op prijs ({mode === "feedIn" ? "hoog → laag" : "laag → hoog"})
          </button>
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-black/50 dark:text-white/50">Geen data beschikbaar voor deze dag.</p>
      ) : (
        <div className="max-h-96 overflow-y-auto rounded-lg border border-black/10 dark:border-white/10">
          <table className="w-full border-collapse text-sm">
            <thead className="sticky top-0 bg-white dark:bg-neutral-900">
              <tr className="text-left text-xs uppercase tracking-wide text-black/50 dark:text-white/50">
                <th className="px-3 py-2 font-medium">Tijdstip</th>
                <th className="px-3 py-2 text-right font-medium">{priceColumnLabel}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ point, price }) => {
                const isCheapest = cheapestPoint?.point.timestamp === point.timestamp;
                const isExpensive = expensivePoint?.point.timestamp === point.timestamp;
                // Bij teruglevering is een hoge prijs juist gunstig, dus draaien we de kleuren om.
                const isGood = mode === "feedIn" ? isExpensive : isCheapest;
                const isBad = mode === "feedIn" ? isCheapest : isExpensive;
                const pointMs = new Date(point.timestamp).getTime();
                const isNow = day === "today" && nowMs !== null && pointMs <= nowMs && nowMs - pointMs < intervalMs;
                return (
                  <tr
                    key={point.timestamp}
                    className={`border-t border-black/5 dark:border-white/5 ${isNow ? "bg-blue-50 dark:bg-blue-500/10" : isGood ? "bg-emerald-50 dark:bg-emerald-500/10" : isBad ? "bg-red-50 dark:bg-red-500/10" : ""}`}
                  >
                    <td className="px-3 py-1.5 tabular-nums">
                      {localTimeLabel(point.timestamp)}
                      {isNow && <span className="ml-2 rounded bg-blue-600 px-1.5 py-0.5 text-[10px] font-semibold text-white">NU</span>}
                    </td>
                    <td className={`px-3 py-1.5 text-right tabular-nums font-medium ${isGood ? "text-emerald-600 dark:text-emerald-400" : isBad ? "text-red-600 dark:text-red-400" : ""}`}>{formatEurCents(price)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
