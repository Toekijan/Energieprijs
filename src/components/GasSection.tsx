"use client";

import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { PricePoint } from "@/lib/types";
import { cheapest, formatEurCents, localDateLabel, todayKey, totalPrice, type Surcharge } from "@/lib/priceUtils";
import { useElementWidth } from "@/lib/useElementWidth";
import { Card } from "./Card";

// Minimale breedte (px) die een daglabel als "do 10 sep" nodig heeft om
// leesbaar te blijven zonder overlap met de buren, incl. wat marge.
const MIN_LABEL_WIDTH_PX = 72;

function colorFor(value: number, min: number, max: number): string {
  if (max === min) return "#60a5fa";
  const t = (value - min) / (max - min);
  const hue = 142 - t * 142;
  return `hsl(${hue}, 70%, 45%)`;
}

export function GasSection({ points, surcharge }: { points: PricePoint[]; surcharge: Surcharge }) {
  const today = points.find((p) => p.timestamp.startsWith(todayKey())) ?? points[points.length - 1] ?? null;
  const cheapestOfSet = cheapest(points);

  const chartData = points.map((p) => ({
    date: localDateLabel(p.timestamp),
    price: totalPrice(p, surcharge),
  }));
  const min = chartData.length ? Math.min(...chartData.map((d) => d.price)) : 0;
  const max = chartData.length ? Math.max(...chartData.map((d) => d.price)) : 0;

  const { ref: chartWrapperRef, width: chartWidth } = useElementWidth<HTMLDivElement>();
  const maxTicks = chartWidth > 0 ? Math.max(2, Math.floor(chartWidth / MIN_LABEL_WIDTH_PX)) : chartData.length;
  const tickInterval = Math.max(0, Math.ceil(chartData.length / maxTicks) - 1);

  return (
    <Card title="Gasprijs (day-ahead)" subtitle="Gas wordt per dag geprijsd, niet per uur">
      {today ? (
        <div className="mb-4 flex items-baseline gap-2">
          <span className="text-3xl font-bold tabular-nums">{formatEurCents(totalPrice(today, surcharge))}</span>
          <span className="text-sm text-black/50 dark:text-white/50">/ m³ vandaag</span>
        </div>
      ) : (
        <p className="mb-4 text-sm text-black/50 dark:text-white/50">Geen prijs voor vandaag beschikbaar.</p>
      )}

      {chartData.length === 0 ? (
        <p className="text-sm text-black/50 dark:text-white/50">Geen historische data beschikbaar.</p>
      ) : (
        <div ref={chartWrapperRef}>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
              <XAxis dataKey="date" interval={tickInterval} tick={{ fontSize: 10 }} />
              <YAxis tickFormatter={(v) => formatEurCents(v)} width={56} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: number) => [formatEurCents(v) + " / m³", "Prijs"]} />
              <Bar dataKey="price" radius={[3, 3, 0, 0]}>
                {chartData.map((d, i) => (
                  <Cell key={i} fill={colorFor(d.price, min, max)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {cheapestOfSet && (
        <p className="mt-3 text-sm">
          <span className="font-medium text-emerald-600 dark:text-emerald-400">Goedkoopste dag in deze periode</span>: {localDateLabel(cheapestOfSet.point.timestamp)} — {formatEurCents(totalPrice(cheapestOfSet.point, surcharge))}/m³
        </p>
      )}
    </Card>
  );
}
