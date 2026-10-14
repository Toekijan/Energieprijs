"use client";

import { useEffect, useState } from "react";

export interface SolarData {
  configured: boolean;
  currentPowerW?: number;
  energyTodayWh?: number;
  intervals?: { timestamp: string; wh: number }[];
  error?: string;
}

const POLL_INTERVAL_MS = 5 * 60 * 1000;

export function useSolar(): SolarData | null {
  const [data, setData] = useState<SolarData | null>(null);

  useEffect(() => {
    let ignore = false;
    const run = () =>
      fetch("/api/solar", { cache: "no-store" })
        .then((r) => r.json())
        .then((d) => {
          if (!ignore) setData(d);
        })
        .catch(() => {
          if (!ignore) setData({ configured: true, error: "Kan geen verbinding maken met de server." });
        });
    run();
    const id = setInterval(run, POLL_INTERVAL_MS);
    return () => {
      ignore = true;
      clearInterval(id);
    };
  }, []);

  return data;
}

/** Waarde (€) van de opwek: som van kWh per kwartier × terugleverprijs (€/kWh) van datzelfde kwartier. */
export function feedInValueEur(intervals: { timestamp: string; wh: number }[], priceByTime: Map<number, number>): number {
  return intervals.reduce((sum, i) => sum + (i.wh / 1000) * (priceByTime.get(new Date(i.timestamp).getTime()) ?? 0), 0);
}
