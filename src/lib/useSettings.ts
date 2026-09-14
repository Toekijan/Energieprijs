"use client";

import { useEffect, useState } from "react";

export interface Settings {
  /** Leveranciersopslag + energiebelasting excl. BTW, in euro per kWh. */
  electricitySurchargeExVat: number;
  /** Leveranciersopslag + energiebelasting excl. BTW, in euro per m3. */
  gasSurchargeExVat: number;
  vatPercent: number;
  /** Lengte van het "goedkoopste blok" voor stroom, in hele uren. */
  windowHours: number;
}

const DEFAULT_SETTINGS: Settings = {
  electricitySurchargeExVat: 0,
  gasSurchargeExVat: 0,
  vatPercent: 21,
  windowHours: 3,
};

const STORAGE_KEY = "energieprijs.settings.v1";

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    // Instellingen worden pas na mount uit localStorage gelezen (niet beschikbaar
    // tijdens SSR); dat geeft hier bewust één extra render bij het opstarten.
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (raw) setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(raw) });
    } catch {
      // localStorage niet beschikbaar (privémodus e.d.) — val terug op defaults.
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {
      // negeren
    }
  }, [settings, loaded]);

  return { settings, setSettings, loaded };
}
