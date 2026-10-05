"use client";
// -----------------------------------------------------------------------------
// Show / hide price levels.
//
// The counter screen faces customers, so price levels (AA, A, B, C, D), their
// markups, our cost and our margins are HIDDEN by default. Staff click
// "Show price levels" in the top bar when they need them, and hide them again
// when a customer walks up. The choice is remembered on this computer only.
// -----------------------------------------------------------------------------
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

const KEY = "pos.showPriceLevels";

const PriceLevelsContext = createContext<{ show: boolean; toggle: () => void }>({
  show: false,
  toggle: () => {},
});

export const usePriceLevels = () => useContext(PriceLevelsContext);

export function PriceLevelsProvider({ children }: { children: ReactNode }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    try {
      setShow(window.localStorage.getItem(KEY) === "1");
    } catch {
      /* private mode: stay hidden */
    }
  }, []);
  const toggle = useCallback(() => {
    setShow((s) => {
      try {
        window.localStorage.setItem(KEY, s ? "0" : "1");
      } catch {
        /* ignore */
      }
      return !s;
    });
  }, []);
  return <PriceLevelsContext.Provider value={{ show, toggle }}>{children}</PriceLevelsContext.Provider>;
}

/** Renders its children only while price levels are shown. */
export function Private({ children, fallback = null }: { children: ReactNode; fallback?: ReactNode }) {
  const { show } = usePriceLevels();
  return <>{show ? children : fallback}</>;
}
