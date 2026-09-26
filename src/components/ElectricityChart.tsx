"use client";

import { useEffect, useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { PricePoint } from "@/lib/types";
import { cheapest, formatEurCents, inferIntervalMinutes, localTimeLabel, mostExpensive, totalPrice, type Surcharge } from "@/lib/priceUtils";
import { useElementWidth } from "@/lib/useElementWidth";
import { Card } from "./Card";

// Minimale breedte (px) die een tijdlabel als "00:00" nodig heeft om leesbaar
// te blijven zonder overlap met de buren, incl. wat marge.
const MIN_LABEL_WIDTH_PX = 44;

type PriceMode = "consumption" | "feedIn";

function colorFor(value: number, min: number, max: number, invert = false): string {
  if (max === min) return "#60a5fa";
  let t = (value - min) / (max - min);
  if (invert) t = 1 - t;
  const hue = 142 - t * 142; // 142=groen, 0=rood
  return `hsl(${hue}, 70%, 45%)`;
}

export function ElectricityChart({
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
  const [mode, setMode] = useState<PriceMode>("consumption");
  const points = day === "tomorrow" ? tomorrowPoints : todayPoints;
  const surcharge = mode === "consumption" ? consumptionSurcharge : feedInSurcharge;

  // Alleen gebruikt om de balk van het huidige uur te markeren; elke minuut
  // is precies genoeg (voorkomt onnodige impure Date.now()-calls tijdens render).
  const [nowMs, setNowMs] = useState<number | null>(null);
  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 60_000);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNowMs(Date.now());
    return () => clearInterval(id);
  }, []);

  const intervalMs = inferIntervalMinutes(points) * 60_000;

  const chartData = useMemo(
    () =>
      points.map((p) => {
        const t = new Date(p.timestamp).getTime();
        return {
          time: localTimeLabel(p.timestamp),
          price: totalPrice(p, surcharge),
          isNow: day === "today" && nowMs !== null && t <= nowMs && nowMs - t < intervalMs,
        };
      }),
    [points, surcharge, day, nowMs, intervalMs]
  );

  const min = chartData.length ? Math.min(...chartData.map((d) => d.price)) : 0;
  const max = chartData.length ? Math.max(...chartData.map((d) => d.price)) : 0;
  const avg = chartData.length ? chartData.reduce((s, d) => s + d.price, 0) / chartData.length : 0;

  const cheapestPoint = cheapest(points);
  const expensivePoint = mostExpensive(points);

  const { ref: chartWrapperRef, width: chartWidth } = useElementWidth<HTMLDivElement>();
  const maxTicks = chartWidth > 0 ? Math.max(2, Math.floor(chartWidth / MIN_LABEL_WIDTH_PX)) : 12;
  const tickInterval = Math.max(0, Math.ceil(chartData.length / maxTicks) - 1);

  const lowLabel = mode === "consumption" ? "Goedkoopst" : "Laagste terugleverprijs";
  const highLabel = mode === "consumption" ? "Duurst" : "Hoogste terugleverprijs";

  return (
    <Card title="Stroomprijs per kwartier (EPEX day-ahead)" subtitle="Kale marktprijs incl. jouw opslag, energiebelasting en BTW">
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
        {tomorrowPoints.length === 0 && day === "today" && <span className="text-xs text-black/40 dark:text-white/40">Prijzen voor morgen meestal beschikbaar vanaf ~15:00 uur</span>}
      </div>

      {chartData.length === 0 ? (
        <p className="text-sm text-black/50 dark:text-white/50">Geen data beschikbaar voor deze dag.</p>
      ) : (
        <>
          <div ref={chartWrapperRef}>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
              <XAxis dataKey="time" interval={tickInterval} tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={(v) => formatEurCents(v)} width={56} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: number) => [formatEurCents(v) + " / kWh", mode === "consumption" ? "Afneemprijs" : "Terugleverprijs"]} labelFormatter={(l) => `Tijd: ${l}`} />
              <ReferenceLine y={avg} stroke="#888" strokeDasharray="4 4" label={{ value: "gem.", position: "insideTopRight", fontSize: 10, fill: "#888" }} />
              <Bar dataKey="price" radius={[3, 3, 0, 0]}>
                {chartData.map((d, i) => (
                  <Cell key={i} fill={colorFor(d.price, min, max, mode === "feedIn")} stroke={d.isNow ? "#1d4ed8" : undefined} strokeWidth={d.isNow ? 2 : 0} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          </div>

          <div className="mt-3 flex flex-wrap gap-4 text-sm">
            {cheapestPoint && (
              <p>
                <span className={`font-medium ${mode === "feedIn" ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400"}`}>{lowLabel}</span> om {localTimeLabel(cheapestPoint.point.timestamp)} — {formatEurCents(totalPrice(cheapestPoint.point, surcharge))}/kWh
              </p>
            )}
            {expensivePoint && (
              <p>
                <span className={`font-medium ${mode === "feedIn" ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>{highLabel}</span> om {localTimeLabel(expensivePoint.point.timestamp)} — {formatEurCents(totalPrice(expensivePoint.point, surcharge))}/kWh
              </p>
            )}
          </div>
        </>
      )}
    </Card>
  );
}
