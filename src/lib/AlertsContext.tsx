"use client";
import { createContext, useContext, useState, ReactNode } from "react";
interface Alert {
  id: string;
  message: string;
}

interface AlertsContextType {
  alerts: Alert[];
  addAlert: (id: string) => void;       // keep this
  updateLowStockAlert: (id: string) => void; // add this
}

const AlertsContext = createContext<AlertsContextType | null>(null);

export const useAlerts = () => {
  const context = useContext(AlertsContext);
  if (!context) throw new Error("useAlerts must be used within an AlertsProvider");
  return context;
};

export function AlertsProvider({ children }: { children: ReactNode }) {
  const [alerts, setAlerts] = useState<Alert[]>([]);

  const addAlert = (id: string) => {
    setAlerts(prev => [...prev, { id, message: `Alert ${id}` }]);
  };

  const updateLowStockAlert = (id: string) => {
    setAlerts(prev => {
      if (prev.some(a => a.id === id)) return prev;
      return [...prev, { id, message: `Product ${id} is low on stock!` }];
    });
    console.log("Low stock alert added", id);
  };

  return (
    <AlertsContext.Provider value={{ alerts, addAlert, updateLowStockAlert }}>
      {children}
    </AlertsContext.Provider>
  );
}
