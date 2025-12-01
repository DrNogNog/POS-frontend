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
  AlertCircle,
  CheckCircle2,
  Clock,
} from "lucide-react";

interface Invoice {
  id: string;
  vendor: string;
  invoiceNumber: string;
  date: string;
  dueDate: string;
  amount: number;
  status: "Paid" | "Pending" | "Overdue" | "Partially Paid";
  paid?: boolean;
  paidAmount?: number;
}

const mockInvoices: Invoice[] = [
  {
    id: "1",
    vendor: "Acme Supplies Co.",
    invoiceNumber: "INV-2025-0481",
    date: "2025-11-15",
    dueDate: "2025-11-30",
    amount: 12500.0,
    status: "Pending",
  },
  {
    id: "2",
    vendor: "TechCorp Solutions",
    invoiceNumber: "INV-2025-0392",
    date: "2025-11-10",
    dueDate: "2025-11-25",
    amount: 8750.5,
    status: "Overdue",
  },
  {
    id: "3",
    vendor: "Office Essentials Ltd",
    invoiceNumber: "INV-2025-0521",
    date: "2025-11-20",
    dueDate: "2025-12-05",
    amount: 3420.0,
    status: "Paid",
    paidAmount: 3420.0,
  },
  {
    id: "4",
    vendor: "CloudHost Pro",
    invoiceNumber: "INV-2025-0610",
    date: "2025-11-18",
    dueDate: "2025-12-18",
    amount: 2999.99,
    status: "Partially Paid",
    paidAmount: 1500.0,
  },
  {
    id: "5",
    vendor: "Freight Masters",
    invoiceNumber: "INV-2025-0444",
    date: "2025-11-12",
    dueDate: "2025-11-27",
    amount: 2100.0,
    status: "Pending",
  },
];

export default function AccountsPayablePage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const totalOutstanding = mockInvoices
    .filter((inv) => inv.status !== "Paid")
    .reduce((sum, inv) => {
      if (inv.status === "Partially Paid") return sum + (inv.amount - (inv.paidAmount || 0));
      return sum + inv.amount;
    }, 0);

  const overdueCount = mockInvoices.filter((i) => i.status === "Overdue").length;

  const filteredInvoices = mockInvoices.filter((invoice) => {
    const matchesSearch =
      invoice.vendor.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === "all" || invoice.status.toLowerCase() === filterStatus.toLowerCase();
    return matchesSearch && matchesFilter;
  });

  const getStatusBadge = (status: Invoice["status"]) => {
    const styles = {
      Paid: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
      Pending: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
      Overdue: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
      "Partially Paid": "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300",
    };
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${styles[status]}`}>
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
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Accounts Payable</h1>
          <p className="text-gray-600 dark:text-gray-400">Manage vendor invoices and payments</p>
        </div>


        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-sm p-6 border border-gray-200 dark:border-zinc-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Outstanding</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
                  ${totalOutstanding.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="p-3 bg-red-100 dark:bg-red-900 rounded-lg">
                <DollarSign className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-sm p-6 border border-gray-200 dark:border-zinc-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Overdue Invoices</p>
                <p className="text-2xl font-bold text-red-600 dark:text-red-400 mt-2">{overdueCount}</p>
              </div>
              <div className="p-3 bg-red-100 dark:bg-red-900 rounded-lg">
                <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-sm p-6 border border-gray-200 dark:border-zinc-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">This Month</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
                  ${mockInvoices.reduce((s, i) => s + i.amount, 0).toLocaleString()}
                </p>
              </div>
              <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <Calendar className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-sm p-6 border border-gray-200 dark:border-zinc-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Paid This Month</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-2">$18,420.00</p>
              </div>
              <div className="p-3 bg-green-100 dark:bg-green-900 rounded-lg">
                <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Toolbar */}
        <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-gray-200 dark:border-zinc-800 p-6 mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search invoices or vendors..."
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
                <option value="pending">Pending</option>
                <option value="paid">Paid</option>
                <option value="overdue">Overdue</option>
                <option value="partially paid">Partially Paid</option>
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

          {/* Invoices Table */}
        <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-gray-200 dark:border-zinc-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-zinc-800 border-b border-gray-200 dark:border-zinc-700">
                <tr>
                  {/* ... headers remain the same ... */}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-zinc-700">
                {filteredInvoices.map((invoice) => (
                  <tr key={invoice.id} className="hover:bg-gray-50 dark:hover:bg-zinc-800 transition">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {invoice.invoiceNumber}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {new Date(invoice.date).toLocaleDateString()}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {invoice.vendor}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <span className={`text-sm ${invoice.status === "Overdue" ? "text-red-600 dark:text-red-400 font-medium" : "text-gray-900 dark:text-white"}`}>
                          {new Date(invoice.dueDate).toLocaleDateString()}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                      ${invoice.amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      {invoice.status === "Partially Paid" && (
                        <span className="block text-xs text-amber-600 dark:text-amber-400">
                          Paid: ${invoice.paidAmount?.toFixed(2)}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(invoice.status)}
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
          <div className="px-6 py-4 border-t border-gray-200 dark:border-zinc-700 flex items-center justify-between">
            <p className="text-sm text-gray-700 dark:text-gray-400">
              Showing <span className="font-medium">{filteredInvoices.length}</span> of{" "}
              <span className="font-medium">{mockInvoices.length}</span> invoices
            </p>
            <div className="flex gap-2">
              <button className="px-3 py-1 border border-gray-300 dark:border-zinc-600 rounded-md text-sm hover:bg-gray-50 dark:hover:bg-zinc-800">
                Previous
              </button>
              <button className="px-3 py-1 bg-blue-600 text-white rounded-md text-sm">1</button>
              <button className="px-3 py-1 border border-gray-300 dark:border-zinc-600 rounded-md text-sm hover:bg-gray-50 dark:hover:bg-zinc-800">
                2
              </button>
              <button className="px-3 py-1 border border-gray-300 dark:border-zinc-600 rounded-md text-sm hover:bg-gray-50 dark:hover:bg-zinc-800">
                Next
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}