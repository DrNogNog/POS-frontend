"use client";

import { useState, useEffect } from "react";
import Sidebar from "@/components/sidebar";
import { Search, DollarSign, TrendingUp, AlertCircle } from "lucide-react";

interface Invoice {
  id: string;
  customer?: string;
  invoiceNo?: string;
  total?: number;
  overdueAmount?: number;
  paidAmount?: number;
  status?: "Paid" | "Pending" | "Overdue" | "Partially Paid" | "Draft";
}

export default function AccountsReceivablePage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  useEffect(() => {
    fetchInvoices();
  }, []);
  async function updateStatus(id: string, newStatus: Invoice["status"]) {
  try {
    // Optimistic UI update
    setInvoices((prev) =>
      prev.map((inv) =>
        inv.id === id ? { ...inv, status: newStatus } : inv
      )
    );

    await fetch(`http://localhost:4000/api/invoices/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
  } catch (err) {
    console.error("Failed to update invoice status", err);
    alert("Error updating invoice status");
    fetchInvoices(); // restore remote version
  }
}

  async function fetchInvoices() {
    try {
      const res = await fetch("http://localhost:4000/api/invoices");
      if (!res.ok) throw new Error("Failed to fetch invoices");
      const data: Invoice[] = await res.json();
      setInvoices(data);
    } catch (err) {
      console.error(err);
      alert("Failed to load invoices.");
    } finally {
      setLoading(false);
    }
  }
  console.log("helllo",invoices);
  // Calculations
  const totalReceivable = invoices.reduce((sum, r) => {
  const amount = Number(r.total) || 0;
  const paid = Number(r.paidAmount) || 0;

  if (r.status === "Paid") return sum;

  if (r.status === "Partially Paid") {
    return sum + Math.max(amount - paid, 0);
  }

  // For Unpaid, Overdue, Draft, etc.
  return sum + amount;
}, 0);

  const overdueAmount = invoices
    .filter((r) => r.status === "Overdue")
    .reduce((sum, r) => sum + (r.overdueAmount ?? 0), 0);

  const paidThisMonth = invoices
    .filter((r) => r.status === "Paid")
    .reduce((sum, r) => sum + (r.paidAmount ?? 0), 0);

  const filtered = invoices.filter((item) => {
    const customer = item.customer ?? "";
    const status = item.status ?? "";

    const matchesSearch =
      customer.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesFilter =
      filterStatus === "all" || status.toLowerCase() === filterStatus.toLowerCase();

    return matchesSearch && matchesFilter;
  });

  return (
    <div className="flex min-h-screen bg-zinc-100 dark:bg-zinc-950">
      <Sidebar />
      <main className="flex-1 p-6 lg:p-10">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Accounts Receivable
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Track customer invoices, payments, and outstanding balances
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-sm p-6 border border-gray-200 dark:border-zinc-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Receivable</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
                  ${(totalReceivable ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <DollarSign className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-sm p-6 border border-gray-200 dark:border-zinc-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Overdue Amount</p>
                <p className="text-2xl font-bold text-red-600 dark:text-red-400 mt-2">
                  ${(overdueAmount ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="p-3 bg-red-100 dark:bg-red-900 rounded-lg">
                <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-sm p-6 border border-gray-200 dark:border-zinc-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Collected This Month</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-2">
                  ${(paidThisMonth ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="p-3 bg-green-100 dark:bg-green-900 rounded-lg">
                <TrendingUp className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-sm p-6 border border-gray-200 dark:border-zinc-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Pending Invoices</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
                  {invoices.filter(r => r.status === "Pending" || r.status === "Partially Paid").length}
                </p>
              </div>
              <div className="p-3 bg-amber-100 dark:bg-amber-900 rounded-lg">
                <TrendingUp className="w-6 h-6 text-amber-600 dark:text-amber-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Toolbar */}
        <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-gray-200 dark:border-zinc-800 p-6 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search customers or invoice number..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-zinc-700 rounded-lg bg-gray-50 dark:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Table */}
        <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-gray-200 dark:border-zinc-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-zinc-800 border-b border-gray-200 dark:border-zinc-700">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Invoice</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Customer</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Amount</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-zinc-700">
                {filtered.map((inv) => (
                  <tr key={inv.id} className="hover:bg-gray-50 dark:hover:bg-zinc-800 transition">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {inv.invoiceNo ?? "—"}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {inv.customer ?? "—"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                      ${(inv.total ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      {inv.status === "Partially Paid" && (
                        <div className="text-xs text-amber-600 dark:text-amber-400">
                          Received: ${(inv.paidAmount ?? 0).toFixed(2)}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                          <select
                            className="px-3 py-1 rounded-full text-xs font-medium cursor-pointer bg-gray-100 dark:bg-zinc-800 border border-gray-300 dark:border-zinc-700"
                            value={inv.status ?? "Pending"}
                            onChange={(e) => updateStatus(inv.id, e.target.value)}
                          >
                            <option value="Paid">Paid</option>
                            <option value="Pending">Pending</option>
                            <option value="Overdue">Overdue</option>
                            <option value="Partially Paid">Partially Paid</option>
                            <option value="Draft">Draft</option>
                          </select>
                        </td>

                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination placeholder */}
          <div className="px-6 py-4 border-t border-gray-200 dark:border-zinc-700 flex items-center justify-between bg-gray-50 dark:bg-zinc-800">
            <p className="text-sm text-gray-700 dark:text-gray-400">
              Showing {filtered.length} of {invoices.length} invoices
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
