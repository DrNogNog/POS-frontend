"use client";

import { useState, useEffect } from "react";
import Sidebar from "@/components/sidebar";

export interface ProductChangeLog {
  id: number;
  productId: string;
  action: "CREATE OR DUPLICATE" | "UPDATE" | "DELETE";
  changes: Record<string, any>;
  timestamp: string;
}

export default function HistoryPage() {
  const [logs, setLogs] = useState<ProductChangeLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadLogs = async () => {
      try {
        const res = await fetch("http://localhost:4000/api/product-change-logs");
        if (!res.ok) throw new Error("Failed to fetch logs");
        const data: ProductChangeLog[] = await res.json();
        setLogs(data.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())); // newest first
      } catch (err) {
        console.error(err);
        setLogs([]);
      } finally {
        setLoading(false);
      }
    };

    loadLogs();
  }, []);

  const renderValue = (value: any) => {
    if (Array.isArray(value)) return value.join(", ");
    if (typeof value === "object" && value !== null) return JSON.stringify(value);
    return value?.toString() ?? "";
  };

  return (
    <div className="flex min-h-screen bg-zinc-100 dark:bg-black">
      <Sidebar />
      <main className="flex-1 p-10">
        <h1 className="text-3xl font-bold mb-6">Product Change History</h1>

        {loading ? (
          <div className="text-center text-zinc-500 dark:text-zinc-400">Loading logs...</div>
        ) : logs.length === 0 ? (
          <div className="text-center text-zinc-500 dark:text-zinc-400">No product change logs found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full bg-white dark:bg-zinc-900 rounded-xl shadow-lg border">
              <thead className="bg-zinc-50 dark:bg-zinc-800 sticky top-0">
                <tr>
                  <th className="px-4 py-2 text-left">Timestamp</th>
                  <th className="px-4 py-2 text-left">Action</th>
                  <th className="px-4 py-2 text-left">Product ID</th>
                  <th className="px-4 py-2 text-left">Changes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-700">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800">
                    <td className="px-4 py-2">{new Date(log.timestamp).toLocaleString()}</td>
                    <td className="px-4 py-2">{log.action}</td>
                    <td className="px-4 py-2">{log.productId}</td>
                    <td className="px-4 py-2">
                      {Object.entries(log.changes).map(([key, value]) => (
                        <div key={key}>
                          <strong>{key}:</strong> {renderValue(value)}
                        </div>
                      ))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
