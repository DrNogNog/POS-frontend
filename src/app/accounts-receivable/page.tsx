"use client";

import { useState } from "react";
import Sidebar from "@/components/sidebar";
import {
  Search,
  Filter,
  Download,
  Plus,
  MoreVertical,
  Calendar,
  DollarSign,
  AlertCircleDollarSign,
  AlertCircle,
  CheckCircle2,
  Clock,
  TrendingUp,
} from "lucide-react";

interface Receivable {
  id: string;
  customer: string;
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  amount: number;
  paidAmount?: number;
  status: "Paid" | "Pending" | "Overdue" | "Partially Paid" | "Draft";
}

const mockReceivables: Receivable[] = [
  {
    id: "1",
    customer: "Global Retail Inc.",
    invoiceNumber: "INV-2025-1001",
    issueDate: "2025-11-18",
    dueDate: "2025-12-18",
    amount: 48500.0,
    status: "Pending",
  },
  {
    id: "2",
    customer: "TechStart Ventures",
    invoiceNumber: "INV-2025-1002",
    issueDate: "2025-11-10",
    dueDate: "2025-11-25",
    amount: 18250.75,
    status: "Overdue",
  },
  {
    id: "3",
    customer: "Summit Logistics",
    invoiceNumber: "INV-2025-1003",
    issueDate: "2025-11-22",
    dueDate: "2025-12-22",
    amount: 8900.0,
    status: "Paid",
    paidAmount: 8900.0,
  },
  {
    id: "4",
    customer: "Nova Digital Agency",
    invoiceNumber: "INV-2025-1004",
    issueDate: "2025-11-15",
    dueDate: "2025-12-15",
    amount: 12500.0,
    status: "Partially Paid",
    paidAmount: 7500.0,
  },
  {
    id: "5",
    customer: "Horizon Manufacturing",
    invoiceNumber: "INV-2025-1005",
    issueDate: "2025-11-28",
    dueDate: "2025-12-28",
    amount: 33400.0,
    status: "Pending",
  },
];

export default function AccountsReceivablePage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  // Calculations
  const totalReceivable = mockReceivables
    .filter((r) => r.status !== "Paid")
    .reduce((sum, r) => {
      if (r.status === "Partially Paid") return sum + (r.amount - (r.paidAmount || 0));
      return sum + r.amount;
    }, 0);

  const overdueAmount = mockReceivables
    .filter((r) => r.status === "Overdue")
    .reduce((sum, r) => sum + r.amount, 0);

  const paidThisMonth = mockReceivables
    .filter((r) => r.status === "Paid")
    .reduce((sum, r) => sum + (r.paidAmount || 0), 0);

  const filtered = mockReceivables.filter((item) => {
    const matchesSearch =
      item.customer.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === "all" || item.status.toLowerCase() === filterStatus.toLowerCase();
    return matchesSearch && matchesFilter;
  });

  const getStatusBadge = (status: Receivable["status"]) => {
    const map = {
      Paid: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
      Pending: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
      Overdue: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
      "Partially Paid": "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300",
      Draft: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300",
    };
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${map[status]}`}>
        {status}
      </span>
    );
  };

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
                  ${totalReceivable.toLocaleString(undefined, { minimumFractionDigits: 2 })}
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
                  ${overdueAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
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
                  ${paidThisMonth.toLocaleString(undefined, { minimumFractionDigits: 2 })}
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
                  {mockReceivables.filter(r => r.status === "Pending" || r.status === "Partially Paid").length}
                </p>
              </div>
              <div className="p-3 bg-amber-100 dark:bg-amber-900 rounded-lg">
                <Clock className="w-6 h-6 text-amber-600 dark:text-amber-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Toolbar */}
        <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-gray-200 dark:border-zinc-800 p-6 mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
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

            <div className="flex gap-3">
              <select
                className="px-4 py-2 border border-gray-300 dark:border-zinc-700 rounded-lg bg-gray-50 dark:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="all">All Status</option>
                <option value="paid">Paid</option>
                <option value="pending">Pending</option>
                <option value="overdue">Overdue</option>
                <option value="partially paid">Partially Paid</option>
                <option value="draft">Draft</option>
              </select>

              <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 transition">
                <Plus className="w-4 h-4" />
                New Invoice
              </button>

              <button className="px-4 py-2 border border-gray-300 dark:border-zinc-700 rounded-lg hover:bg-gray-50 dark:hover:bg-zinc-800 flex items-center gap-2 transition">
                <Download className="w-4 h-4" />
                Export
              </button>
            </div>
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
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Due Date</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Amount</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-zinc-700">
                {filtered.map((inv) => (
                  <tr key={inv.id} className="hover:bg-gray-50 dark:hover:bg-zinc-800 transition">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {inv.invoiceNumber}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          Issued {new Date(inv.issueDate).toLocaleDateString()}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {inv.customer}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <span className={`text-sm ${inv.status === "Overdue" ? "text-red-600 font-medium dark:text-red-400" : "text-gray-900 dark:text-white"}`}>
                          {new Date(inv.dueDate).toLocaleDateString()}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                      ${inv.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      {inv.status === "Partially Paid" && (
                        <div className="text-xs text-amber-600 dark:text-amber-400">
                          Received: ${inv.paidAmount?.toFixed(2)}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(inv.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <button className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                        <MoreVertical className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="px-6 py-4 border-t border-gray-200 dark:border-zinc-700 flex items-center justify-between bg-gray-50 dark:bg-zinc-800">
            <p className="text-sm text-gray-700 dark:text-gray-400">
              Showing {filtered.length} of {mockReceivables.length} invoices
            </p>
            <div className="flex gap-2">
              <button className="px-4 py-1.5 border border-gray-300 dark:border-zinc-600 rounded-md text-sm hover:bg-white dark:hover:bg-zinc-700">Prev</button>
              <button className="px-4 py-1.5 bg-blue-600 text-white rounded-md text-sm">1</button>
              <button className="px-4 py-1.5 border border-gray-300 dark:border-zinc-600 rounded-md text-sm hover:bg-white dark:hover:bg-zinc-700">Next</button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}