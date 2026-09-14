"use client";

import type { PricePoint } from "@/lib/types";
import { cheapestWindow, formatEurCents, localTimeLabel, totalPrice, type Surcharge } from "@/lib/priceUtils";
import { Card } from "./Card";

export function CheapestWindowCard({ todayPoints, tomorrowPoints, windowHours, onWindowHoursChange, surcharge }: { todayPoints: PricePoint[]; tomorrowPoints: PricePoint[]; windowHours: number; onWindowHoursChange: (h: number) => void; surcharge: Surcharge }) {
  const combined = [...todayPoints, ...tomorrowPoints];
  const win = cheapestWindow(combined, windowHours);

  return (
    <Card title="Goedkoopste aaneengesloten periode" subtitle="Handig voor wasmachine, EV-lader, warmtepomp e.d.">
      <div className="mb-4 flex items-center gap-3">
        <label htmlFor="window-hours" className="text-sm text-black/60 dark:text-white/60">
          Duur:
        </label>
        <select id="window-hours" value={windowHours} onChange={(e) => onWindowHoursChange(Number(e.target.value))} className="rounded-md border border-black/10 bg-transparent px-2 py-1 text-sm dark:border-white/20">
          {[1, 2, 3, 4, 5, 6, 8].map((h) => (
            <option key={h} value={h}>
              {h} uur
            </option>
          ))}
        </select>
      </div>

      {win ? (
        <div>
          <p className="text-2xl font-bold tabular-nums">
            {localTimeLabel(win.points[0].timestamp)} – {localTimeLabel(new Date(new Date(win.points[win.points.length - 1].timestamp).getTime() + 3600 * 1000).toISOString())}
          </p>
          <p className="mt-1 text-sm text-black/60 dark:text-white/60">
            Gemiddeld <span className="font-semibold text-emerald-600 dark:text-emerald-400">{formatEurCents(totalPrice({ timestamp: win.points[0].timestamp, priceExVat: win.averagePriceExVat }, surcharge))}</span> / kWh in dit blok
          </p>
        </div>
      ) : (
        <p className="text-sm text-black/50 dark:text-white/50">Onvoldoende data om een blok van {windowHours} uur te vinden.</p>
      )}
    </Card>
  );
}
