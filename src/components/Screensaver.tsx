"use client";
// -----------------------------------------------------------------------------
// Screensaver: after 5 minutes without a touch, click or key press the screen
// is covered by the logo and a slowly drifting clock. This hides whatever was
// open (customer details, prices) and protects the display. Price levels are
// switched back to hidden. Any touch, click or key brings the work back.
// -----------------------------------------------------------------------------
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { usePriceLevels } from "@/lib/privacy";

const IDLE_MS = 5 * 60 * 1000;
const EVENTS = ["pointerdown", "pointermove", "keydown", "wheel", "touchstart", "scroll"] as const;

export default function Screensaver({ storeName }: { storeName: string }) {
  const [active, setActive] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeRef = useRef(false);
  const { hide } = usePriceLevels();

  useEffect(() => {
    const start = () => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        activeRef.current = true;
        setActive(true);
        hide();
      }, IDLE_MS);
    };
    const onActivity = (e: Event) => {
      if (activeRef.current) {
        // Waking up: swallow this touch so it doesn't click what's underneath
        if (e.type === "pointerdown" || e.type === "keydown" || e.type === "touchstart") {
          e.preventDefault();
          e.stopPropagation();
        }
        if (e.type === "pointermove" || e.type === "scroll") return; // a bumped mouse shouldn't wake it
        activeRef.current = false;
        setActive(false);
      }
      start();
    };
    EVENTS.forEach((ev) => window.addEventListener(ev, onActivity, { capture: true, passive: false }));
    start();
    return () => {
      EVENTS.forEach((ev) => window.removeEventListener(ev, onActivity, { capture: true }));
      if (timer.current) clearTimeout(timer.current);
    };
  }, [hide]);

  useEffect(() => {
    if (!active) return;
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 1000 * 15);
    return () => clearInterval(t);
  }, [active]);

  if (!active) return null;
  return (
    <div
      role="dialog"
      aria-label="Screensaver. Touch anywhere to continue."
      className="fixed inset-0 z-[100] flex cursor-pointer items-center justify-center overflow-hidden bg-walnut-deep text-ivory"
      style={{ animation: "pos-fade-in 1.2s ease-out" }}
    >
      <div className="flex flex-col items-center text-center" style={{ animation: "pos-drift 120s ease-in-out infinite" }}>
        <div className="mb-10 overflow-hidden rounded-lux bg-white/95 shadow-2xl">
          <Image src="/Champion.png" alt="Champion Point of Sale" width={448} height={381} className="h-auto w-56" />
        </div>
        <div className="font-display text-8xl font-semibold leading-none tracking-tight">
          {now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
        </div>
        <div className="mt-4 font-display text-3xl text-maple">
          {now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
        </div>
        <div className="mt-10 overflow-hidden rounded-lux bg-white/95 px-3 py-2">
          <Image src="/Invoice%20Logo.png" alt={storeName} width={209} height={45} className="h-10 w-auto" />
        </div>
        <div className="mt-2 text-sm text-ivory/55">Touch anywhere to continue</div>
      </div>
    </div>
  );
}
