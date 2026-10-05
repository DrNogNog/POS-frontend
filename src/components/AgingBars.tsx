"use client";
// Horizontal bars for aging buckets: current -> 90+ days, getting darker/redder
// the later the money is. Click a bar to filter the list below.
import { money } from "@/lib/format";
import type { Aging } from "@/lib/types";
import { cn } from "@/lib/utils";

const BUCKETS: { key: keyof Omit<Aging, "total">; label: string; color: string }[] = [
  { key: "current", label: "Not due yet", color: "bg-oak/50" },
  { key: "1-30", label: "1–30 days late", color: "bg-due/70" },
  { key: "31-60", label: "31–60 days late", color: "bg-due" },
  { key: "61-90", label: "61–90 days late", color: "bg-late/80" },
  { key: "90+", label: "Over 90 days late", color: "bg-late" },
];

export default function AgingBars({
  aging,
  selected,
  onSelect,
}: {
  aging: Aging;
  selected?: string;
  onSelect?: (bucket: string) => void;
}) {
  const max = Math.max(1, ...BUCKETS.map((b) => aging[b.key]));
  return (
    <ul className="space-y-2">
      {BUCKETS.map((b) => {
        const value = aging[b.key];
        const share = aging.total > 0 ? Math.round((value / aging.total) * 100) : 0;
        return (
          <li key={b.key}>
            <button
              type="button"
              onClick={() => onSelect?.(selected === b.key ? "" : b.key)}
              className={cn(
                "grid w-full grid-cols-[9.5rem_1fr_7rem] items-center gap-3 rounded-lux px-4 py-1.5 text-left text-sm hover:bg-linen",
                selected === b.key && "bg-linen ring-1 ring-oak"
              )}
            >
              <span className="text-walnut">{b.label}</span>
              <span className="h-5 rounded-lux bg-linen">
                <span className={cn("block h-5 rounded-lux", b.color)} style={{ width: `${(value / max) * 100}%` }} />
              </span>
              <span className="num font-medium">
                {money(value)} <span className="text-xs text-oak">{share}%</span>
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
