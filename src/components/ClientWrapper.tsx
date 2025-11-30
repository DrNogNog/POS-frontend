"use client";

import { ReactNode } from "react";
import { AlertsProvider } from "@/lib/AlertsContext";

export default function ClientWrapper({ children }: { children: ReactNode }) {
  return <AlertsProvider>{children}</AlertsProvider>;
}
