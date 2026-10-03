"use client";

import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { SolarPoint } from "@/lib/types";
import { currentPoint, inferIntervalMinutes, localTimeLabel, pointsForDate, todayKey } from "@/lib/priceUtils";
import { Card } from "./Card";

function formatPower(watt: number): string {
  return watt >= 1000 ? `${(watt / 1000).toFixed(2)} kW` : `${Math.round(watt)} W`;
}

function formatEnergyKWh(wh: number): string {
  return `${(wh / 1000).toFixed(2)} kWh`;
}

export function SolarSection({
  points,
  currentPowerW,
  baselineLoadW,
  error,
  notConfigured,
}: {
  points: SolarPoint[];
  currentPowerW: number | null;
  baselineLoadW: number;
  error: string | null;
  notConfigured: boolean;
}) {
  const todayPoints = useMemo(() => pointsForDate(points, todayKey()), [points]);
  const latestPoint = currentPoint(points);
  const livePowerW = currentPowerW ?? latestPoint?.powerW ?? null;

  const totalEnergyWhToday = todayPoints.reduce((sum, p) => sum + p.energyWh, 0);
  const selfSufficientCount = todayPoints.filter((p) => p.powerW >= baselineLoadW).length;
  const selfSufficientPct = todayPoints.length > 0 ? Math.round((selfSufficientCount / todayPoints.length) * 100) : null;

  const intervalMinutes = inferIntervalMinutes(todayPoints);

  const chartData = todayPoints.map((p) => ({
    time: localTimeLabel(p.timestamp),
    powerW: p.powerW,
    selfSufficient: p.powerW >= baselineLoadW,
  }));

  if (notConfigured) {
    return (
      <Card title="Zonnepanelen (Enphase)" subtitle="Nog niet gekoppeld">
        <p className="text-sm text-black/60 dark:text-white/60">
          Koppel je Enphase-systeem om hier je opwek te zien. Volg de stappen onder &quot;Zonnepanelen (Enphase)&quot; in de README (<code className="rounded bg-black/5 px-1 dark:bg-white/10">npm run enphase:setup</code>) en
          vul de resulterende env-variabelen in.
        </p>
      </Card>
    );
  }

  return (
    <Card title="Zonnepanelen (Enphase)" subtitle="Opwek per kwartier, excl. huisverbruik">
      {error && (
        <p className="mb-3 text-sm text-red-600 dark:text-red-400">
          Let op: {error}
        </p>
      )}

      <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div>
          <p className="text-xs text-black/40 dark:text-white/40">Huidig vermogen</p>
          <p className="text-2xl font-bold tabular-nums">{livePowerW !== null ? formatPower(livePowerW) : "—"}</p>
        </div>
        <div>
          <p className="text-xs text-black/40 dark:text-white/40">Opgewekt vandaag</p>
          <p className="text-2xl font-bold tabular-nums">{formatEnergyKWh(totalEnergyWhToday)}</p>
        </div>
        <div>
          <p className="text-xs text-black/40 dark:text-white/40">Zelfvoorzienend vandaag</p>
          <p className="text-2xl font-bold tabular-nums">{selfSufficientPct !== null ? `${selfSufficientPct}%` : "—"}</p>
        </div>
      </div>

      {chartData.length === 0 ? (
        <p className="text-sm text-black/50 dark:text-white/50">Nog geen opwekdata voor vandaag.</p>
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
            <XAxis dataKey="time" interval={Math.max(0, Math.ceil(chartData.length / 12) - 1)} tick={{ fontSize: 11 }} />
            <YAxis tickFormatter={(v) => formatPower(v)} width={64} tick={{ fontSize: 11 }} />
            <Tooltip formatter={(v: number) => [formatPower(v), "Vermogen"]} labelFormatter={(l) => `Tijd: ${l}`} />
            <ReferenceLine y={baselineLoadW} stroke="#888" strokeDasharray="4 4" label={{ value: "geschat verbruik", position: "insideTopRight", fontSize: 10, fill: "#888" }} />
            <Bar dataKey="powerW" radius={[3, 3, 0, 0]}>
              {chartData.map((d, i) => (
                <Cell key={i} fill={d.selfSufficient ? "#16a34a" : "#cbd5e1"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}

      <p className="mt-3 text-xs text-black/40 dark:text-white/40">
        &quot;Zelfvoorzienend&quot; = kwartieren waarin de opwek minstens je geschatte huisverbruik ({formatPower(baselineLoadW)}, instelbaar) haalt — een schatting, want dit systeem meet alleen opwek, niet je werkelijke
        verbruik. Interval: {intervalMinutes} min.
      </p>
    </Card>
  );
}
