"use client";

import type { SolarData } from "@/lib/useSolar";
import { Card } from "./Card";

const kw = (w: number) => (w / 1000).toFixed(2).replace(".", ",");
const kwh = (wh: number) => (wh / 1000).toFixed(1).replace(".", ",");
const eur = (v: number) => `€ ${v.toFixed(2).replace(".", ",")}`;

export function SolarCard({ data, feedInValueTodayEur }: { data: SolarData | null; feedInValueTodayEur: number | null }) {
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
        <>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-2xl font-bold">{kw(data.currentPowerW ?? 0)} kW</p>
              <p className="text-xs text-black/50 dark:text-white/50">Nu</p>
            </div>
            <div>
              <p className="text-2xl font-bold">{kwh(data.energyTodayWh ?? 0)} kWh</p>
              <p className="text-xs text-black/50 dark:text-white/50">Vandaag</p>
            </div>
            <div>
              <p className="text-2xl font-bold">{feedInValueTodayEur === null ? "—" : eur(feedInValueTodayEur)}</p>
              <p className="text-xs text-black/50 dark:text-white/50">Waarde vandaag</p>
            </div>
          </div>
          <p className="mt-3 text-xs text-black/40 dark:text-white/40">Waarde = opwek per kwartier × terugleverprijs (incl. jouw instellingen). Indicatie: de opwek is bruto en houdt geen rekening met eigen verbruik.</p>
        </>
      )}
    </Card>
  );
}
