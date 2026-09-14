"use client";

import { useEffect, useState } from "react";
import type { PricesResponse } from "./types";

const POLL_INTERVAL_MS = 5 * 60 * 1000;

interface State {
  data: PricesResponse | null;
  error: string | null;
  loading: boolean;
}

export function usePrices(endpoint: "/api/electricity" | "/api/gas") {
  const [state, setState] = useState<State>({ data: null, error: null, loading: true });
  const [refreshToken, setRefreshToken] = useState(0);

  useEffect(() => {
    let ignore = false;

    async function run() {
      try {
        const res = await fetch(endpoint, { cache: "no-store" });
        const body = await res.json();
        if (ignore) return;
        if (!res.ok) {
          setState({ data: null, error: body.error ?? `Fout ${res.status}`, loading: false });
          return;
        }
        setState({ data: body as PricesResponse, error: null, loading: false });
      } catch {
        if (!ignore) setState((s) => ({ ...s, error: "Kan geen verbinding maken met de server.", loading: false }));
      }
    }

    // Data ophalen bij mount/refresh en periodiek bijwerken.
    run();
    const id = setInterval(run, POLL_INTERVAL_MS);
    return () => {
      ignore = true;
      clearInterval(id);
    };
  }, [endpoint, refreshToken]);

  return { ...state, refresh: () => setRefreshToken((t) => t + 1) };
}
