"use client";

import { useEffect, useMemo, useState } from "react";
import { Bar, CartesianGrid, Cell, ComposedChart, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { PricePoint, SolarPoint } from "@/lib/types";
import { solarKwhPerQuarter } from "@/lib/solarUtils";
import { cheapest, dateKeyOffset, formatEurCents, inferIntervalMinutes, localTimeLabel, mostExpensive, pointsForDate, todayKey, tomorrowKey, totalPrice, type Surcharge } from "@/lib/priceUtils";
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

type LineKey = "avg" | "solar" | "feedIn" | "lastWeekAvg" | "lastWeekSolar";

function LineToggle({ on, onToggle, colorClass, trackClass, children }: { on: boolean; onToggle: () => void; colorClass: string; trackClass: string; children: React.ReactNode }) {
  return (
    <button type="button" role="switch" aria-checked={on} onClick={onToggle} className="flex items-center gap-2 text-left text-sm">
      <span className={`relative inline-block h-4 w-7 shrink-0 rounded-full transition ${on ? trackClass : "bg-black/20 dark:bg-white/20"}`}>
        <span className={`absolute top-0.5 h-3 w-3 rounded-full bg-white shadow transition-all ${on ? "left-3.5" : "left-0.5"}`} />
      </span>
      <span className={`font-medium ${on ? colorClass : "text-black/40 line-through dark:text-white/40"}`}>{children}</span>
    </button>
  );
}

export function ElectricityChart({
  baselineLoadW,
  allPoints,
  solarPoints,
  lastWeekSolarPoints,
  todayPoints,
  tomorrowPoints,
  consumptionSurcharge,
  feedInSurcharge,
}: {
  baselineLoadW: number;
  allPoints: PricePoint[];
  solarPoints: SolarPoint[];
  lastWeekSolarPoints: SolarPoint[];
  todayPoints: PricePoint[];
  tomorrowPoints: PricePoint[];
  consumptionSurcharge: Surcharge;
  feedInSurcharge: Surcharge;
}) {
  const [day, setDay] = useState<"today" | "tomorrow">("today");
  const [mode, setMode] = useState<PriceMode>("consumption");
  const [visible, setVisible] = useState<Record<LineKey, boolean>>({ avg: true, solar: true, feedIn: true, lastWeekAvg: true, lastWeekSolar: true });
  const toggle = (k: LineKey) => setVisible((v) => ({ ...v, [k]: !v[k] }));
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

  const solarByTime = useMemo(() => solarKwhPerQuarter(solarPoints), [solarPoints]);
  const showSolar = day === "today" && solarByTime.size > 0;
  const feedInTotalKwh = useMemo(() => {
    const kwhPerSlot = (baselineLoadW / 1000) * (inferIntervalMinutes(points) / 60);
    return [...solarByTime.values()].reduce((sum, v) => sum + Math.max(0, v - kwhPerSlot), 0);
  }, [solarByTime, baselineLoadW, points]);
  const solarTotalKwh = useMemo(() => [...solarByTime.values()].reduce((sum, v) => sum + v, 0), [solarByTime]);

  // Opwek vorige week, op lokale tijdlabel (blijft kloppen bij zomer-/wintertijd).
  const lastWeekSolarByLabel = useMemo(() => {
    const map = new Map<string, number>();
    for (const [t, kwh] of solarKwhPerQuarter(lastWeekSolarPoints)) map.set(localTimeLabel(new Date(t).toISOString()), kwh);
    return map;
  }, [lastWeekSolarPoints]);
  const hasLastWeekSolar = showSolar && lastWeekSolarByLabel.size > 0;

  const chartData = useMemo(
    () =>
      points.map((p) => {
        const t = new Date(p.timestamp).getTime();
        return {
          time: localTimeLabel(p.timestamp),
          solarKwh: solarByTime.get(t) ?? null,
          // Schatting: opwek minus het geschatte huisverbruik in dat kwartier.
          feedInKwh: solarByTime.has(t) ? Math.max(0, solarByTime.get(t)! - (baselineLoadW / 1000) * (intervalMs / 3_600_000)) : null,
          lastWeekSolarKwh: lastWeekSolarByLabel.get(localTimeLabel(p.timestamp)) ?? null,
          price: totalPrice(p, surcharge),
          isNow: day === "today" && nowMs !== null && t <= nowMs && nowMs - t < intervalMs,
        };
      }),
    [points, surcharge, day, nowMs, intervalMs, solarByTime, lastWeekSolarByLabel, baselineLoadW]
  );

  const min = chartData.length ? Math.min(...chartData.map((d) => d.price)) : 0;
  const max = chartData.length ? Math.max(...chartData.map((d) => d.price)) : 0;
  const avg = chartData.length ? chartData.reduce((s, d) => s + d.price, 0) / chartData.length : 0;

  const lastWeekSolarKwh = useMemo(() => [...solarKwhPerQuarter(lastWeekSolarPoints).values()].reduce((sum, v) => sum + v, 0), [lastWeekSolarPoints]);

  const referenceDateKey = day === "tomorrow" ? tomorrowKey() : todayKey();
  const lastWeekPoints = useMemo(() => pointsForDate(allPoints, dateKeyOffset(referenceDateKey, -7)), [allPoints, referenceDateKey]);
  const lastWeekAvg = lastWeekPoints.length > 0 ? lastWeekPoints.reduce((s, p) => s + totalPrice(p, surcharge), 0) / lastWeekPoints.length : null;

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
            <ComposedChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
              <XAxis dataKey="time" interval={tickInterval} tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={(v) => formatEurCents(v)} width={56} tick={{ fontSize: 11 }} />
              {((showSolar && (visible.solar || visible.feedIn)) || (hasLastWeekSolar && visible.lastWeekSolar)) && <YAxis yAxisId="solar" orientation="right" width={44} tick={{ fontSize: 11 }} unit=" kWh" />}
              <Tooltip formatter={(v: number, name: string) => (name === "solarKwh" || name === "lastWeekSolarKwh" || name === "feedInKwh" ? [`${v.toFixed(2).replace(".", ",")} kWh`, name === "solarKwh" ? "Opwek" : name === "feedInKwh" ? "Teruglevering (schatting)" : "Opwek vorige week"] : [formatEurCents(v) + " / kWh", mode === "consumption" ? "Afneemprijs" : "Terugleverprijs"])} labelFormatter={(l) => `Tijd: ${l}`} />
              <Bar dataKey="price" radius={[3, 3, 0, 0]}>
                {chartData.map((d, i) => (
                  <Cell key={i} fill={colorFor(d.price, min, max, mode === "feedIn")} stroke={d.isNow ? "#1d4ed8" : undefined} strokeWidth={d.isNow ? 2 : 0} />
                ))}
              </Bar>
              {showSolar && visible.solar && <Line yAxisId="solar" dataKey="solarKwh" type="monotone" stroke="#2563eb" strokeWidth={2.5} dot={false} />}
              {showSolar && visible.feedIn && <Line yAxisId="solar" dataKey="feedInKwh" type="monotone" stroke="#9333ea" strokeWidth={2.5} dot={false} />}
              {hasLastWeekSolar && visible.lastWeekSolar && <Line yAxisId="solar" dataKey="lastWeekSolarKwh" type="monotone" stroke="#dc2626" strokeWidth={2} dot={false} />}
              {visible.avg && <ReferenceLine y={avg} stroke="#222" strokeWidth={1.5} strokeDasharray="4 4"  />}
              {lastWeekAvg !== null && visible.lastWeekAvg && (
                <ReferenceLine y={lastWeekAvg} stroke="#dc2626" strokeWidth={1.5} strokeDasharray="4 4"  />
              )}
            </ComposedChart>
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
            <LineToggle on={visible.avg} onToggle={() => toggle("avg")} colorClass="text-black dark:text-white" trackClass="bg-neutral-800 dark:bg-neutral-300">
              Gemid. {day === "tomorrow" ? "morgen" : "vandaag"} {formatEurCents(avg)}/kWh
            </LineToggle>
            {showSolar && (
              <LineToggle on={visible.solar} onToggle={() => toggle("solar")} colorClass="text-blue-600 dark:text-blue-400" trackClass="bg-blue-600">
                Opwek vandaag {solarTotalKwh.toFixed(1).replace(".", ",")} kWh
              </LineToggle>
            )}
            {showSolar && (
              <LineToggle on={visible.feedIn} onToggle={() => toggle("feedIn")} colorClass="text-purple-600 dark:text-purple-400" trackClass="bg-purple-600">
                Teruglevering (schatting) {feedInTotalKwh.toFixed(1).replace(".", ",")} kWh
              </LineToggle>
            )}
            {lastWeekAvg !== null && (
              <LineToggle on={visible.lastWeekAvg} onToggle={() => toggle("lastWeekAvg")} colorClass="text-red-600 dark:text-red-400" trackClass="bg-red-600">
                Gemid. vorige week {formatEurCents(lastWeekAvg)}/kWh
              </LineToggle>
            )}
            {hasLastWeekSolar && (
              <LineToggle on={visible.lastWeekSolar} onToggle={() => toggle("lastWeekSolar")} colorClass="text-red-600 dark:text-red-400" trackClass="bg-red-600">
                Opwek vorige week {lastWeekSolarKwh.toFixed(1).replace(".", ",")} kWh
              </LineToggle>
            )}
          </div>
        </>
      )}
    </Card>
  );
}
