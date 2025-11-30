"use client";

import { useState, useEffect } from "react";
import Sidebar from "@/components/sidebar";
import { api } from "@/lib/api";
import { useRouter } from "next/navigation";

interface Order {
  id: number;
  productId: string;
  name: string;
  description?: string | null;
  vendors?: string | null;
  count: number;
  createdAt: string;
  invoiceNo?: string | null; // optional if used to link BillingPDF
}

interface BillingPDF {
  orderId: number;
  invoiceNo: string;
}

export default function PurchaseOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [pdfMap, setPdfMap] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const loadOrders = async () => {
    try {
      const ordersRes: Order[] = await api("/orders");

      // Load Billing PDFs
      const pdfRes: BillingPDF[] = await api("/billing"); // returns all PDFs with orderId
      const pdfLookup: Record<number, string> = {};
      pdfRes.forEach((pdf) => {
        if (pdf.orderId) pdfLookup[pdf.orderId] = pdf.invoiceNo;
      });

      setOrders(ordersRes);
      setPdfMap(pdfLookup);
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
        <h1 className="text-3xl font-bold mb-8 text-black dark:text-white">
          Purchase Orders
        </h1>

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
                  <th className="px-6 py-4 text-left">Billing</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-700">
                {orders.map((order) => {
                  const pdfInvoiceNo = pdfMap[order.id];

                  return (
                    <tr
                      key={order.id}
                      className="hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    >
                      <td className="px-6 py-4">{order.id}</td>
                      <td className="px-6 py-4">{order.productId}</td>
                      <td className="px-6 py-4">{order.name}</td>
                      <td className="px-6 py-4">{order.description || "-"}</td>
                      <td className="px-6 py-4">{order.vendors || "-"}</td>
                      <td className="px-6 py-4 text-right">{order.count}</td>
                      <td className="px-6 py-4">
                        {new Date(order.createdAt).toLocaleString()}
                      </td>

                      {/* Billing Button */}
                      <td className="px-6 py-4 space-x-2">
                        {pdfInvoiceNo ? (
                          <button
                             onClick={() =>
   window.open(
  `http://localhost:4000/api/billing/view?invoiceNo=${pdfInvoiceNo}`,
  "_blank"
)
  }
                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                          >
                            View PDF
                          </button>
                        ) : (
                          <button
                            onClick={() =>
                              router.push(
                                `/billing?orderId=${order.id}&vendors=${encodeURIComponent(
                                  order.vendors || ""
                                )}`
                              )
                            }
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                          >
                            Billing Form
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
