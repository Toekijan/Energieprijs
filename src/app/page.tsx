"use client";

import { CheapestWindowCard } from "@/components/CheapestWindowCard";
import { CurrentElectricityCard } from "@/components/CurrentElectricityCard";
import { ElectricityChart } from "@/components/ElectricityChart";
import { GasSection } from "@/components/GasSection";
import { SettingsPanel } from "@/components/SettingsPanel";
import { StatusBar } from "@/components/StatusBar";
import { usePrices } from "@/lib/usePrices";
import { useSettings } from "@/lib/useSettings";
import { currentPoint, pointsForDate, tomorrowKey, todayKey } from "@/lib/priceUtils";

export default function Home() {
  const electricity = usePrices("/api/electricity");
  const gas = usePrices("/api/gas");
  const { settings, setSettings } = useSettings();

  const electricityPoints = electricity.data?.points ?? [];
  const todayPoints = pointsForDate(electricityPoints, todayKey());
  const tomorrowPoints = pointsForDate(electricityPoints, tomorrowKey());
  const current = currentPoint(electricityPoints);

  const gasPoints = gas.data?.points ?? [];

  const electricitySurcharge = { surchargeExVat: settings.electricitySurchargeExVat, vatPercent: settings.vatPercent };
  const gasSurcharge = { surchargeExVat: settings.gasSurchargeExVat, vatPercent: settings.vatPercent };

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6">
      <header>
        <h1 className="text-2xl font-bold sm:text-3xl">Energieprijs Monitor</h1>
        <p className="mt-1 text-sm text-black/60 dark:text-white/60">Dynamische day-ahead stroom- (EPEX) en gasprijzen (EEX), met de goedkoopste momenten in beeld.</p>
      </header>

      <StatusBar fetchedAt={electricity.data?.fetchedAt ?? gas.data?.fetchedAt ?? null} error={electricity.error ?? gas.error} onRefresh={() => { electricity.refresh(); gas.refresh(); }} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <CurrentElectricityCard current={current} todayPoints={todayPoints} surcharge={electricitySurcharge} />
        <CheapestWindowCard todayPoints={todayPoints} tomorrowPoints={tomorrowPoints} windowHours={settings.windowHours} onWindowHoursChange={(h) => setSettings({ ...settings, windowHours: h })} surcharge={electricitySurcharge} />
      </div>

      <ElectricityChart todayPoints={todayPoints} tomorrowPoints={tomorrowPoints} surcharge={electricitySurcharge} />

      <GasSection points={gasPoints} surcharge={gasSurcharge} />

      <SettingsPanel settings={settings} onChange={setSettings} />

      <footer className="mt-4 border-t border-black/10 pt-4 text-xs text-black/40 dark:border-white/10 dark:text-white/40">
        <p>
          Bron: publieke day-ahead tarieven van EnergyZero (EPEX Day Ahead voor stroom en gas). Getoonde prijzen zijn de kale groothandelsmarktprijs, optioneel verhoogd met de door jou ingevulde opslag en BTW. Dit is
          geen tarief van of advies namens Vattenfall of enige andere leverancier — controleer altijd je eigen contract en jaarafrekening voor de exacte tarieven die voor jou gelden.
        </p>
      </footer>
    </div>
  );
}
