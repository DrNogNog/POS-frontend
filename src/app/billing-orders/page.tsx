// app/billing-orders/page.tsx
"use client";

import { useState, useEffect } from "react";
import Sidebar from "@/components/sidebar";
import { FileText, Eye, Calendar, Package } from "lucide-react";

interface BillingPDF {
  orderId: number;
  invoiceNo: string;
  createdAt: string; // ISO string from Prisma
}

export default function BillingOrdersPage() {
  const [billingOrders, setBillingOrders] = useState<BillingPDF[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchBillingOrders = async () => {
      try {
        const res = await fetch("http://localhost:4000/api/billing");
        if (!res.ok) throw new Error("Failed to load billing orders");

        const data = await res.json();
        // Sort by newest first
        const sorted = data.sort((a: BillingPDF, b: BillingPDF) =>
          b.createdAt.localeCompare(a.createdAt)
        );
        setBillingOrders(sorted);
      } catch (err: any) {
        setError(err.message || "Something went wrong");
      } finally {
        setLoading(false);
      }
    };

    fetchBillingOrders();
  }, []);

  const viewPDF = (orderId: number) => {
    window.open(`http://localhost:4000/api/billing/view?orderId=${orderId}`, "_blank");
  };

  const formatDate = (isoString: string) => {
    return new Date(isoString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 p-8">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-gray-900 flex items-center gap-3">
              <FileText className="w-10 h-10 text-blue-600" />
              All Billing Orders
            </h1>
            <p className="text-gray-600 mt-2">View and download all generated purchase invoices</p>
          </div>

          {loading ? (
            <div className="bg-white rounded-xl shadow-sm border p-12 text-center">
              <div className="animate-spin inline-block w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full"></div>
              <p className="mt-4 text-gray-600">Loading billing orders...</p>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-lg">
              Error: {error}
            </div>
          ) : billingOrders.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-2xl border-2 border-dashed border-gray-300">
              <FileText className="w-20 h-20 text-gray-400 mx-auto mb-4" />
              <p className="text-2xl font-semibold text-gray-700">No Billing Orders Yet</p>
              <p className="text-gray-500 mt-2">Create your first purchase order to see it here</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Invoice No
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <Package className="w-4 h-4 inline mr-1" />
                        Order ID
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <Calendar className="w-4 h-4 inline mr-1" />
                        Created
                      </th>
                      <th className="px-6 py-4 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {billingOrders.map((order) => (
                      <tr key={order.orderId} className="hover:bg-gray-50 transition">
                        <td className="px-6 py-5 font-semibold text-lg text-blue-700">
                          {order.invoiceNo}
                        </td>
                        <td className="px-6 py-5 text-gray-700">
                          #{order.orderId}
                        </td>
                        <td className="px-6 py-5 text-sm text-gray-600">
                          {formatDate(order.createdAt)}
                        </td>
                        <td className="px-6 py-5 text-center">
                          <button
                            onClick={() => viewPDF(order.orderId)}
                            className="inline-flex items-center gap-2 px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition shadow-sm"
                          >
                            <Eye className="w-4 h-4" />
                            View PDF
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="mt-8 text-center text-sm text-gray-500">
            Total Billing Orders: <span className="font-bold text-gray-700">{billingOrders.length}</span>
          </div>
        </div>
      </main>
    </div>
  );
}