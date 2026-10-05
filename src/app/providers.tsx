"use client";
import type { ReactNode } from "react";
import { SessionProvider } from "@/lib/session";
import { ToastProvider } from "@/components/ui";
import AppShell from "@/components/AppShell";

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <ToastProvider>
        <AppShell>{children}</AppShell>
      </ToastProvider>
    </SessionProvider>
  );
}
