"use client";

import { useState, useEffect } from "react";
import Sidebar from "@/components/sidebar";
import { api } from "@/lib/api";

interface Order {
  id: number;
  productId: string;
  name: string;
  description?: string | null;
  vendors?: string | null;
  count: number;
  createdAt: string;
}

export default function PurchaseOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  const loadOrders = async () => {
    try {
      const res = await api("/orders"); // make sure your backend route returns all orders
      const data: Order[] = Array.isArray(res) ? res : [];
      setOrders(data);
    } catch (err) {
      console.error(err);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  return (
    <div className="flex min-h-screen bg-zinc-100 dark:bg-black">
      <Sidebar />
      <main className="flex-1 p-10">
        <h1 className="text-3xl font-bold mb-8 text-black dark:text-white">Purchase Orders</h1>

        {loading ? (
          <div className="text-center text-white">Loading...</div>
        ) : orders.length === 0 ? (
          <div className="text-center text-white">No orders found.</div>
        ) : (
          <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-xl border overflow-x-auto">
            <table className="w-full table-auto">
              <thead className="bg-zinc-50 dark:bg-zinc-800 border-b sticky top-0 z-10">
                <tr>
                  <th className="px-6 py-4 text-left">ID</th>
                  <th className="px-6 py-4 text-left">Product ID</th>
                  <th className="px-6 py-4 text-left">Name</th>
                  <th className="px-6 py-4 text-left">Description</th>
                  <th className="px-6 py-4 text-left">Vendors</th>
                  <th className="px-6 py-4 text-right">Order Count</th>
                  <th className="px-6 py-4 text-left">Created At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-700">
                {orders.map((order) => (
                  <tr key={order.id} className="hover:bg-zinc-100 dark:hover:bg-zinc-800">
                    <td className="px-6 py-4">{order.id}</td>
                    <td className="px-6 py-4">{order.productId}</td>
                    <td className="px-6 py-4">{order.name}</td>
                    <td className="px-6 py-4">{order.description || "-"}</td>
                    <td className="px-6 py-4">{order.vendors || "-"}</td>
                    <td className="px-6 py-4 text-right">{order.count}</td>
                    <td className="px-6 py-4">{new Date(order.createdAt).toLocaleString()}</td>
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
