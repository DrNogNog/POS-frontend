"use client";
// -----------------------------------------------------------------------------
// Who is logged in, which store we're in, and that store's settings
// (price tiers, tax rates, categories). Every page reads this with useSession().
// -----------------------------------------------------------------------------
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { api, session } from "./api";
import type { SettingsBundle, Store, User } from "./types";

interface SessionValue {
  user: User | null;
  store: Store | null;
  stores: Store[];
  settings: SettingsBundle | null;
  loading: boolean;
  error: string;
  reloadSettings: () => Promise<void>;
  switchStore: (id: string) => Promise<void>;
  logout: () => void;
  can: (...roles: User["role"][]) => boolean;
}

const SessionContext = createContext<SessionValue | null>(null);

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used inside <SessionProvider>");
  return ctx;
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [store, setStore] = useState<Store | null>(null);
  const [stores, setStores] = useState<Store[]>([]);
  const [settings, setSettings] = useState<SettingsBundle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const reloadSettings = useCallback(async () => {
    setSettings(await api<SettingsBundle>("/settings"));
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await api<Store[]>("/auth/stores");
        if (cancelled) return;
        setStores(list);
        if (!session.token) return;
        const me = await api<{ user: User; store: Store }>("/auth/me");
        if (cancelled) return;
        setUser(me.user);
        setStore(me.store);
        setSettings(await api<SettingsBundle>("/settings"));
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const switchStore = useCallback(async (id: string) => {
    // Make sure this login also has an account in the other store first.
    await api("/auth/me", { store: id });
    session.setStore(id);
    window.location.href = "/";
  }, []);

  const logout = useCallback(() => {
    session.clear();
    window.location.href = "/login";
  }, []);

  const can = useCallback(
    (...roles: User["role"][]) => !!user && (user.role === "OWNER" || roles.includes(user.role)),
    [user]
  );

  return (
    <SessionContext.Provider
      value={{ user, store, stores, settings, loading, error, reloadSettings, switchStore, logout, can }}
    >
      {children}
    </SessionContext.Provider>
  );
}
