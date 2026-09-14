"use client";

import { useState } from "react";
import type { Settings } from "@/lib/useSettings";
import { Card } from "./Card";

export function SettingsPanel({ settings, onChange }: { settings: Settings; onChange: (s: Settings) => void }) {
  const [open, setOpen] = useState(false);

  return (
    <Card className="col-span-full">
      <button onClick={() => setOpen((o) => !o)} className="flex w-full items-center justify-between text-left">
        <span className="text-sm font-semibold uppercase tracking-wide text-black/60 dark:text-white/60">Instellingen: jouw opslag en BTW</span>
        <span className="text-black/40 dark:text-white/40">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <label className="text-sm">
            <span className="mb-1 block text-black/60 dark:text-white/60">Opslag stroom (ct/kWh, excl. BTW)</span>
            <input type="number" step="0.1" value={settings.electricitySurchargeExVat * 100} onChange={(e) => onChange({ ...settings, electricitySurchargeExVat: Number(e.target.value) / 100 })} className="w-full rounded-md border border-black/10 bg-transparent px-2 py-1.5 dark:border-white/20" />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-black/60 dark:text-white/60">Opslag gas (ct/m³, excl. BTW)</span>
            <input type="number" step="0.1" value={settings.gasSurchargeExVat * 100} onChange={(e) => onChange({ ...settings, gasSurchargeExVat: Number(e.target.value) / 100 })} className="w-full rounded-md border border-black/10 bg-transparent px-2 py-1.5 dark:border-white/20" />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-black/60 dark:text-white/60">BTW %</span>
            <input type="number" step="1" value={settings.vatPercent} onChange={(e) => onChange({ ...settings, vatPercent: Number(e.target.value) })} className="w-full rounded-md border border-black/10 bg-transparent px-2 py-1.5 dark:border-white/20" />
          </label>
          <p className="col-span-full text-xs text-black/40 dark:text-white/40">
            Vul hier de leveranciersopslag en energiebelasting in zoals vermeld op jouw eigen contract of jaarnota (bijv. Vattenfall FlexPrijs). Wij vullen deze niet automatisch in — de app toont anders alleen de kale
            groothandelsprijs.
          </p>
        </div>
      )}
    </Card>
  );
}
