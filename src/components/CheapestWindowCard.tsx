"use client";

import type { PricePoint } from "@/lib/types";
import { cheapestWindow, formatEurCents, inferIntervalMinutes, localDateLabel, localTimeLabel, todayKey, localDateKey, totalPrice, type Surcharge } from "@/lib/priceUtils";
import { Card } from "./Card";

const DURATION_OPTIONS: { hours: number; label: string }[] = [
  { hours: 0.25, label: "15 min" },
  { hours: 0.5, label: "30 min" },
  { hours: 1, label: "1 uur" },
  { hours: 2, label: "2 uur" },
  { hours: 3, label: "3 uur" },
  { hours: 4, label: "4 uur" },
  { hours: 6, label: "6 uur" },
  { hours: 8, label: "8 uur" },
];

export function CheapestWindowCard({ todayPoints, tomorrowPoints, windowHours, onWindowHoursChange, surcharge }: { todayPoints: PricePoint[]; tomorrowPoints: PricePoint[]; windowHours: number; onWindowHoursChange: (h: number) => void; surcharge: Surcharge }) {
  const combined = [...todayPoints, ...tomorrowPoints];
  const win = cheapestWindow(combined, windowHours);
  const intervalMs = inferIntervalMinutes(combined) * 60_000;

  return (
    <Card title="Goedkoopste aaneengesloten periode" subtitle="Handig voor wasmachine, EV-lader, warmtepomp e.d.">
      <div className="mb-4 flex items-center gap-3">
        <label htmlFor="window-hours" className="text-sm text-black/60 dark:text-white/60">
          Duur:
        </label>
        <select id="window-hours" value={windowHours} onChange={(e) => onWindowHoursChange(Number(e.target.value))} className="rounded-md border border-black/10 bg-transparent px-2 py-1 text-sm dark:border-white/20">
          {DURATION_OPTIONS.map(({ hours, label }) => (
            <option key={hours} value={hours}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {win ? (
        <div>
          <p className="text-2xl font-bold tabular-nums">
            {localTimeLabel(win.points[0].timestamp)} – {localTimeLabel(new Date(new Date(win.points[win.points.length - 1].timestamp).getTime() + intervalMs).toISOString())}
          </p>
          <p className="mt-0.5 text-sm text-black/50 dark:text-white/50">
            {localDateKey(win.points[0].timestamp) === todayKey() ? "Vandaag" : `Morgen (${localDateLabel(win.points[0].timestamp)})`}
          </p>
          <p className="mt-1 text-sm text-black/60 dark:text-white/60">
            Gemiddeld <span className="font-semibold text-emerald-600 dark:text-emerald-400">{formatEurCents(totalPrice({ timestamp: win.points[0].timestamp, priceExVat: win.averagePriceExVat }, surcharge))}</span> / kWh in dit blok
          </p>
        </div>
      ) : (
        <p className="text-sm text-black/50 dark:text-white/50">
          Onvoldoende data om een blok van {DURATION_OPTIONS.find((o) => o.hours === windowHours)?.label ?? `${windowHours} uur`} te vinden.
        </p>
      )}
    </Card>
  );
}
