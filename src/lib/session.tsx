"use client";
// -----------------------------------------------------------------------------
// Who is logged in, which store this is (named in Settings — each store's
// data lives on its own drive), and that store's settings
// (price tiers, tax rates, categories). Every page reads this with useSession().
// -----------------------------------------------------------------------------
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { api, session } from "./api";
import type { SettingsBundle, Store, User } from "./types";

interface SessionValue {
  user: User | null;
  /** The store whose drive the server is running from. */
  store: Store | null;
  settings: SettingsBundle | null;
  loading: boolean;
  error: string;
  reloadSettings: () => Promise<void>;
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
      value={{ user, store, settings, loading, error, reloadSettings, logout, can }}
    >
      {children}
    </SessionContext.Provider>
  );
}
