"use client";

import { useCallback, useRef, useState } from "react";

/**
 * Meet de actuele breedte (px) van een element, bijgewerkt bij resize/rotatie.
 *
 * Gebruikt een callback-ref (i.p.v. useRef + useLayoutEffect met lege deps):
 * het gemeten element wordt vaak pas na een later re-render gemount (bv.
 * zodra async data binnenkomt en een lege-staat message plaatsmaakt voor de
 * echte chart-div). Een callback-ref vuurt elke keer dat het element
 * daadwerkelijk aan- of losgekoppeld wordt, dus die mis je nooit.
 */
export function useElementWidth<T extends HTMLElement>() {
  const [width, setWidth] = useState(0);
  const observerRef = useRef<ResizeObserver | null>(null);

  const ref = useCallback((el: T | null) => {
    observerRef.current?.disconnect();
    observerRef.current = null;
    if (!el) return;

    setWidth(el.getBoundingClientRect().width);

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) setWidth(entry.contentRect.width);
    });
    observer.observe(el);
    observerRef.current = observer;
  }, []);

  return { ref, width };
}
