"use client";

import { useEffect, useState } from "react";
import type { SolarResponse } from "./types";

const POLL_INTERVAL_MS = 15 * 60 * 1000;

interface State {
  data: SolarResponse | null;
  error: string | null;
  notConfigured: boolean;
  loading: boolean;
}

export function useSolarData() {
  const [state, setState] = useState<State>({ data: null, error: null, notConfigured: false, loading: true });
  const [refreshToken, setRefreshToken] = useState(0);

  useEffect(() => {
    let ignore = false;

    async function run() {
      try {
        const res = await fetch("/api/solar", { cache: "no-store" });
        const body = await res.json();
        if (ignore) return;
        if (!res.ok) {
          setState({ data: null, error: body.error ?? `Fout ${res.status}`, notConfigured: Boolean(body.notConfigured), loading: false });
          return;
        }
        setState({ data: body as SolarResponse, error: null, notConfigured: false, loading: false });
      } catch {
        if (!ignore) setState((s) => ({ ...s, error: "Kan geen verbinding maken met de server.", loading: false }));
      }
    }

    run();
    const id = setInterval(run, POLL_INTERVAL_MS);
    return () => {
      ignore = true;
      clearInterval(id);
    };
  }, [refreshToken]);

  return { ...state, refresh: () => setRefreshToken((t) => t + 1) };
}
