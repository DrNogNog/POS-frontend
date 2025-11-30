"use client";

import Sidebar from "@/components/sidebar";
import { productChangeLogs } from "@/lib/productChangeLogs";
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from "recharts";

export default function HistoryPage() {
  // Convert timestamps to Date objects for sorting
  const data = productChangeLogs.map((log, index) => ({
    name: new Date(log.timestamp).toLocaleString(),
    changeIndex: index + 1,
    description: log.changes,
  }));

  return (
    <div className="flex min-h-screen bg-zinc-100">
      <Sidebar />
      <div className="flex-1 p-10">
        <h1 className="text-3xl font-bold mb-6">Product Schema Change Log</h1>

        <div className="mb-10">
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" angle={-45} textAnchor="end" height={60} />
              <YAxis allowDecimals={false} />
              <Tooltip
                    formatter={(value, name, props) => props?.payload?.description ?? ""}
                    />

              <Line type="monotone" dataKey="changeIndex" stroke="#8884d8" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="space-y-2">
          {data.map((log) => (
            <div key={log.name} className="p-4 bg-white rounded shadow">
              <p className="text-sm text-gray-500">{log.name}</p>
              <p>{log.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
