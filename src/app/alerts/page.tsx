"use client";

import Sidebar from "@/components/sidebar";
import { useAlerts } from "@/lib/AlertsContext";

export default function AlertsPage() {
  const { alerts, addAlert } = useAlerts();

  return (
    <div className="flex min-h-screen bg-zinc-100 dark:bg-black">
      <Sidebar />
      <main className="flex-1 p-10">
        <h1 className="text-3xl font-bold mb-6">Alerts</h1>

        {alerts.length === 0 ? (
          <p className="text-zinc-500 dark:text-zinc-400">No alerts</p>
        ) : (
          <ul className="space-y-2">
            {alerts.map((alert) => (
              <li
                key={alert.id}
                className="p-4 bg-red-100 dark:bg-red-900 rounded-lg text-red-800 dark:text-red-200"
              >
                {alert.message}
              </li>
            ))}
          </ul>
        )}

        <div className="mt-6">
          <button
            className="px-4 py-2 bg-blue-500 text-white rounded"
            onClick={() => addAlert("123")}
          >
            Test Alert
          </button>
        </div>
      </main>
    </div>
  );
}
