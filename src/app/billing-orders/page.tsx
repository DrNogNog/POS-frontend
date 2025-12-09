// app/billing-orders/page.tsx
"use client";

import { useState, useEffect } from "react";
import Sidebar from "@/components/sidebar";
import { FileText, Eye, Calendar, Package, Search } from "lucide-react";

interface BillingPDF {
  orderId: number;
  invoiceNo: string;
  createdAt: string; // ISO string
}

export default function BillingOrdersPage() {
  const [billingOrders, setBillingOrders] = useState<BillingPDF[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<BillingPDF[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedQuarter, setSelectedQuarter] = useState("all");

  useEffect(() => {
    const fetchBillingOrders = async () => {
      try {
        const res = await fetch("http://localhost:4000/api/billing");
        if (!res.ok) throw new Error("Failed to load billing orders");

        const data: BillingPDF[] = await res.json();
        const sorted = data.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        setBillingOrders(sorted);
        setFilteredOrders(sorted);
      } catch (err: any) {
        setError(err.message || "Something went wrong");
      } finally {
        setLoading(false);
      }
    };

    fetchBillingOrders();
  }, []);

  // Filter by search + quarter
  useEffect(() => {
    let filtered = billingOrders;

    // Search filter
    if (searchTerm.trim()) {
      const query = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (order) =>
          order.invoiceNo.toLowerCase().includes(query) ||
          order.orderId.toString().includes(query)
      );
    }

    // Quarter filter
    if (selectedQuarter !== "all") {
      filtered = filtered.filter((order) => {
        const date = new Date(order.createdAt);
        const month = date.getMonth() + 1;
        const quarter = month <= 3 ? "Q1" : month <= 6 ? "Q2" : month <= 9 ? "Q3" : "Q4";
        return quarter === selectedQuarter;
      });
    }

    setFilteredOrders(filtered);
  }, [searchTerm, selectedQuarter, billingOrders]);

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

  const getQuarterLabel = (q: string) => {
    switch (q) {
      case "Q1": return "Q1 (Jan–Mar)";
      case "Q2": return "Q2 (Apr–Jun)";
      case "Q3": return "Q3 (Jul–Sep)";
      case "Q4": return "Q4 (Oct–Dec)";
      default: return "All Quarters";
    }
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

          {/* Search + Quarter Filter Toolbar */}
          <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
              {/* Search */}
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search invoice # or order ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                />
              </div>

              {/* Quarter Filter */}
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none" />
                <select
                  value={selectedQuarter}
                  onChange={(e) => setSelectedQuarter(e.target.value)}
                  className="pl-10 pr-10 py-3 border border-gray-300 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer"
                >
                  <option value="all">All Quarters</option>
                  <option value="Q1">Q1 (Jan–Mar)</option>
                  <option value="Q2">Q2 (Apr–Jun)</option>
                  <option value="Q3">Q3 (Jul–Sep)</option>
                  <option value="Q4">Q4 (Oct–Dec)</option>
                </select>
              </div>
            </div>

            {/* Results count */}
            {(searchTerm || selectedQuarter !== "all") && (
              <div className="mt-4 text-sm text-gray-600">
                Showing <strong>{filteredOrders.length}</strong> of{" "}
                <strong>{billingOrders.length}</strong> billing orders
                {searchTerm && ` for "${searchTerm}"`}
                {selectedQuarter !== "all" && ` in ${getQuarterLabel(selectedQuarter)}`}
              </div>
            )}
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
          ) : filteredOrders.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-2xl border-2 border-dashed border-gray-300">
              <FileText className="w-20 h-20 text-gray-400 mx-auto mb-4" />
              <p className="text-2xl font-semibold text-gray-700">
                {searchTerm || selectedQuarter !== "all"
                  ? "No billing orders found"
                  : "No Billing Orders Yet"}
              </p>
              <p className="text-gray-500 mt-2">
                {searchTerm || selectedQuarter !== "all"
                  ? "Try adjusting your search or filter."
                  : "Create your first purchase order to see it here"}
              </p>
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
                    {filteredOrders.map((order) => (
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
            {searchTerm || selectedQuarter !== "all" ? (
              <span className="ml-2">
                • Showing: <span className="font-bold">{filteredOrders.length}</span>
              </span>
            ) : null}
          </div>
        </div>
      </main>
    </div>
  );
}