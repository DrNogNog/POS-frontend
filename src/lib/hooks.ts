"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "./api";

/** Load data from the API. Re-runs when `path` changes. Pass null to skip. */
export function useApi<T>(path: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(Boolean(path));
  const requestId = useRef(0);

  const reload = useCallback(async () => {
    if (!path) return;
    const id = ++requestId.current;
    setLoading(true);
    try {
      const result = await api<T>(path);
      if (id === requestId.current) {
        setData(result);
        setError("");
      }
    } catch (e) {
      if (id === requestId.current) setError(e instanceof Error ? e.message : String(e));
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }, [path]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { data, error, loading, reload, setData };
}

/** Value that only updates after the user stops typing. */
export function useDebounced<T>(value: T, ms = 250): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

/** Read a ?param from the address bar (client only). */
export function useQueryParam(name: string): string {
  const [value, setValue] = useState("");
  useEffect(() => {
    setValue(new URLSearchParams(window.location.search).get(name) || "");
  }, [name]);
  return value;
}

/**
 * Column sorting state for tables. Clicking a new column sorts it newest /
 * biggest first, except the columns in `ascFirst` (names, suppliers, prices),
 * which start A→Z / lowest first. Clicking again flips it.
 */
export function useSort<K extends string>(initial: K, initialDir: "asc" | "desc" = "desc", ascFirst: readonly K[] = []) {
  const [sort, setSort] = useState<K>(initial);
  const [dir, setDir] = useState<"asc" | "desc">(initialDir);
  const toggle = (key: K) => {
    if (key === sort) setDir(dir === "asc" ? "desc" : "asc");
    else {
      setSort(key);
      setDir(ascFirst.includes(key) ? "asc" : "desc");
    }
  };
  return { sort, dir, toggle, query: `sort=${sort}&dir=${dir}` };
}
