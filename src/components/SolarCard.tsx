"use client";

import { useEffect, useState } from "react";
import { Card } from "./Card";

interface Solar {
  configured: boolean;
  currentPowerW?: number;
  energyTodayWh?: number;
  error?: string;
}

const kw = (w: number) => (w / 1000).toFixed(2).replace(".", ",");
const kwh = (wh: number) => (wh / 1000).toFixed(1).replace(".", ",");

export function SolarCard() {
  const [data, setData] = useState<Solar | null>(null);

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
    const id = setInterval(run, 5 * 60 * 1000);
    return () => {
      ignore = true;
      clearInterval(id);
    };
  }, []);

  return (
    <Card title="Zonnepanelen (Enphase)" subtitle="Opwek van je eigen systeem">
      {!data ? (
        <p className="text-sm text-black/50 dark:text-white/50">Laden…</p>
      ) : !data.configured ? (
        <p className="text-sm text-black/60 dark:text-white/60">
          Koppel je Enphase-systeem om hier je opwek te zien. Volg de stappen onder &quot;Zonnepanelen (Enphase)&quot; in de README (<code>npm run enphase:setup</code>).
        </p>
      ) : data.error ? (
        <p className="text-sm text-red-600 dark:text-red-400">{data.error}</p>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-2xl font-bold">{kw(data.currentPowerW ?? 0)} kW</p>
            <p className="text-xs text-black/50 dark:text-white/50">Nu</p>
          </div>
          <div>
            <p className="text-2xl font-bold">{kwh(data.energyTodayWh ?? 0)} kWh</p>
            <p className="text-xs text-black/50 dark:text-white/50">Vandaag</p>
          </div>
        </div>
      )}
    </Card>
  );
}
