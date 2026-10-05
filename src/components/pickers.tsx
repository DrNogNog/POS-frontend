"use client";
// Search-as-you-type pickers for products and customers.
import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { useDebounced } from "@/lib/hooks";
import { money, qty } from "@/lib/format";
import { usePriceLevels } from "@/lib/privacy";
import type { Customer, Product } from "@/lib/types";
import { Input } from "./ui";

function useOutsideClose(onClose: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);
  return ref;
}

export function ProductSearch({
  onPick,
  placeholder = "Search item code, name or collection…",
  autoFocus,
}: {
  onPick: (p: Product) => void;
  placeholder?: string;
  autoFocus?: boolean;
}) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<Product[]>([]);
  const [active, setActive] = useState(0);
  const debounced = useDebounced(q);
  const ref = useOutsideClose(() => setOpen(false));
  const { show: showLevels } = usePriceLevels();

  useEffect(() => {
    if (!debounced.trim()) return setResults([]);
    let cancelled = false;
    api<{ items: Product[] }>(`/products?q=${encodeURIComponent(debounced)}&limit=12`)
      .then((r) => !cancelled && (setResults(r.items), setActive(0)))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [debounced]);

  const pick = (p: Product) => {
    onPick(p);
    setQ("");
    setResults([]);
    setOpen(false);
  };

  return (
    <div ref={ref} className="relative">
      <Input
        value={q}
        autoFocus={autoFocus}
        placeholder={placeholder}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") setActive((a) => Math.min(a + 1, results.length - 1));
          if (e.key === "ArrowUp") setActive((a) => Math.max(a - 1, 0));
          if (e.key === "Enter" && results[active]) {
            e.preventDefault();
            pick(results[active]);
          }
        }}
        aria-label="Search items"
      />
      {open && results.length > 0 && (
        <ul className="absolute z-30 mt-1 max-h-80 w-full overflow-auto rounded-md border border-hairline bg-white shadow-lg">
          {results.map((p, i) => (
            <li key={p.id}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(p)}
                className={`flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm ${i === active ? "bg-linen" : ""}`}
              >
                <span>
                  <span className="font-semibold text-walnut">{p.itemCode}</span>{" "}
                  <span className="text-ink">{p.name}</span>
                </span>
                <span className="num text-oak">
                  {qty(p.qtyOnHand)} on hand{showLevels && ` · cost ${money(p.unitCost)}`}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function CustomerSearch({
  onPick,
  onCreate,
}: {
  onPick: (c: Customer) => void;
  onCreate?: (name: string) => void;
}) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<Customer[]>([]);
  const debounced = useDebounced(q);
  const ref = useOutsideClose(() => setOpen(false));

  useEffect(() => {
    if (!debounced.trim()) return setResults([]);
    let cancelled = false;
    api<Customer[]>(`/customers?q=${encodeURIComponent(debounced)}`)
      .then((r) => !cancelled && setResults(r))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [debounced]);

  return (
    <div ref={ref} className="relative">
      <Input
        value={q}
        placeholder="Find customer by name, phone or email…"
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        aria-label="Search customers"
      />
      {open && q.trim() && (
        <ul className="absolute z-30 mt-1 max-h-80 w-full overflow-auto rounded-md border border-hairline bg-white shadow-lg">
          {results.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onPick(c);
                  setQ("");
                  setOpen(false);
                }}
                className="flex w-full justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-linen"
              >
                <span>
                  <span className="font-semibold text-walnut">{c.name}</span>
                  {c.company && <span className="text-oak"> — {c.company}</span>}
                </span>
                <span className="text-oak">{c.phone}</span>
              </button>
            </li>
          ))}
          {onCreate && (
            <li>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onCreate(q);
                  setQ("");
                  setOpen(false);
                }}
                className="w-full px-3 py-2 text-left text-sm font-medium text-walnut hover:bg-linen"
              >
                + Add &ldquo;{q}&rdquo; as a new customer
              </button>
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
