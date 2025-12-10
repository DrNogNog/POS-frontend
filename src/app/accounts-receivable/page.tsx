"use client";

import { useState, useEffect } from "react";
import Sidebar from "@/components/sidebar";
import {
  Search,
  DollarSign,
  TrendingUp,
  AlertCircle,
  Clock,
  CheckCircle2,
} from "lucide-react";

interface Invoice {
  id: number;
  invoiceNo: string;
  total: string;
  paidAmount: string;
  dueDate: string;
  status: "PENDING" | "PAID" | "PARTIALLY_PAID" | "OVERDUE";
  createdAt: string;
  daysOverdue?: number;
}

export default function AccountsReceivablePage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  // Payment modal
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedInv, setSelectedInv] = useState<Invoice | null>(null);
  const [paymentInput, setPaymentInput] = useState("");

  // Due Date Edit modal
  const [editingDueDate, setEditingDueDate] = useState<Invoice | null>(null);
  const [newDueDate, setNewDueDate] = useState("");

  useEffect(() => {
    fetchInvoices();
  }, []);

  async function fetchInvoices() {
    try {
      const res = await fetch("http://localhost:4000/api/invoices");
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();

      const now = new Date();

      const enriched = data.map((inv: any) => {
        const total = parseFloat(inv.total);
        const paid = parseFloat(inv.paidAmount || "0");
        const due = new Date(inv.dueDate);
        const isOverdue = now > due;
        const daysOverdue = Math.max(0, Math.floor((now.getTime() - due.getTime()) / 86400000));

        let status: Invoice["status"] = inv.status || "PENDING";

        if (status !== "PAID" && status !== "PARTIALLY_PAID") {
          if (paid >= total) status = "PAID";
          else if (paid > 0) status = "PARTIALLY_PAID";
          else if (isOverdue) status = "OVERDUE";
        }

        return {
          ...inv,
          status,
          daysOverdue: status === "OVERDUE" ? daysOverdue : 0,
        };
      });

      setInvoices(enriched);
    } catch (err) {
      alert("Failed to load invoices");
    } finally {
      setLoading(false);
    }
  }

  // Record Payment
  const recordPayment = async () => {
    if (!selectedInv || !paymentInput || parseFloat(paymentInput) <= 0) return;

    const amount = parseFloat(paymentInput);
    try {
      await fetch(`http://localhost:4000/api/invoices/${selectedInv.id}/pay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount }),
      });

      setModalOpen(false);
      setPaymentInput("");
      setSelectedInv(null);
      fetchInvoices();
    } catch {
      alert("Payment failed");
    }
  };

  // Save New Due Date — FIXED: was "async ()adecimal" → now correct
  const saveNewDueDate = async () => {
    if (!editingDueDate || !newDueDate) return;

    try {
      await fetch(`http://localhost:4000/api/invoices/${editingDueDate.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dueDate: newDueDate }),
      });

      setEditingDueDate(null);
      setNewDueDate("");
      fetchInvoices();
    } catch {
      alert("Failed to update due date");
    }
  };

  // Calculations
  const totalReceivable = invoices
    .filter((i) => i.status !== "PAID")
    .reduce((sum, i) => sum + (parseFloat(i.total) - parseFloat(i.paidAmount || "0")), 0);

  const overdueAmount = invoices
    .filter((i) => i.status === "OVERDUE")
    .reduce((sum, i) => sum + (parseFloat(i.total) - parseFloat(i.paidAmount || "0")), 0);

  const collectedThisMonth = invoices.reduce((sum, i) => {
    const paid = parseFloat(i.paidAmount || "0");
    const month = new Date(i.createdAt).getMonth();
    return month === new Date().getMonth() ? sum + paid : sum;
  }, 0);

  const filtered = invoices.filter(
    (i) =>
      i.invoiceNo.toLowerCase().includes(searchTerm.toLowerCase()) &&
      (filterStatus === "all" || i.status === filterStatus)
  );

  const getStatusBadge = (status: Invoice["status"]) => {
    const map = {
      PAID: { label: "Paid in Full", color: "bg-green-100 text-green-800", icon: CheckCircle2 },
      PARTIALLY_PAID: { label: "Partially Paid", color: "bg-yellow-100 text-yellow-800", icon: DollarSign },
      OVERDUE: { label: "Overdue", color: "bg-red-100 text-red-800", icon: AlertCircle },
      PENDING: { label: "Pending", color: "bg-gray-100 text-gray-800", icon: Clock },
    };
    const config = map[status];
    const Icon = config.icon;
    return (
      <span className={`px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 w-fit ${config.color}`}>
        <Icon className="w-4 h-4" />
        {config.label}
      </span>
    );
  };

  if (loading) return <div className="flex min-h-screen items-center justify-center text-2xl">Loading...</div>;

  return (
    <div className="flex min-h-screen bg-zinc-100">
      <Sidebar />
      <main className="flex-1 p-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-10">Accounts Receivable</h1>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          <div className="bg-white rounded-2xl shadow-lg p-6 border">
            <p className="text-sm text-gray-600">Total Receivable</p>
            <p className="text-3xl font-bold text-blue-600 mt-2">${totalReceivable.toFixed(2)}</p>
          </div>
          <div className="bg-white rounded-2xl shadow-lg p-6 border">
            <p className="text-sm text-gray-600">Overdue</p>
            <p className="text-3xl font-bold text-red-600 mt-2">${overdueAmount.toFixed(2)}</p>
          </div>
          <div className="bg-white rounded-2xl shadow-lg p-6 border">
            <p className="text-sm text-gray-600">Collected This Month</p>
            <p className="text-3xl font-bold text-green-600 mt-2">${collectedThisMonth.toFixed(2)}</p>
          </div>
          <div className="bg-white rounded-2xl shadow-lg p-6 border">
            <p className="text-sm text-gray-600">Pending</p>
            <p className="text-3xl font-bold text-amber-600 mt-2">
              {invoices.filter((i) => i.status !== "PAID").length}
            </p>
          </div>
        </div>

        {/* Search + Filter */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search invoice..."
                className="w-full pl-10 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-6 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Status</option>
              <option value="PENDING">Pending</option>
              <option value="PARTIALLY_PAID">Partially Paid</option>
              <option value="PAID">Paid in Full</option>
              <option value="OVERDUE">Overdue</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-8 py-5 text-left text-xs font-semibold text-gray-600 uppercase">Invoice</th>
                <th className="px-8 py-5 text-left text-xs font-semibold text-gray-600 uppercase">Amount</th>
                <th className="px-8 py-5 text-left text-xs font-semibold text-gray-600 uppercase">Due Date</th>
                <th className="px-8 py-5 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                <th className="px-8 py-5 text-left text-xs font-semibold text-gray-600 uppercase">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map((inv) => {
                const remaining = parseFloat(inv.total) - parseFloat(inv.paidAmount || "0");
                return (
                  <tr key={inv.id} className="hover:bg-gray-50">
                    <td className="px-8 py-6 font-semibold text-blue-700 text-lg">#{inv.invoiceNo}</td>
                    <td className="px-8 py-6">
                      <div className="text-lg font-medium">${parseFloat(inv.total).toFixed(2)}</div>
                      {inv.status === "PARTIALLY_PAID" && (
                        <div className="text-sm text-gray-600 mt-1">
                          Paid: <span className="font-medium">${parseFloat(inv.paidAmount).toFixed(2)}</span> • 
                          <span className="text-amber-600 font-medium">Due: ${remaining.toFixed(2)}</span>
                        </div>
                      )}
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-3">
                        <span className="text-gray-700">
                          {new Date(inv.dueDate).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </span>
                        <button
                          onClick={() => {
                            setEditingDueDate(inv);
                            setNewDueDate(inv.dueDate.split("T")[0]); // YYYY-MM-DD
                          }}
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium underline"
                        >
                          Edit
                        </button>
                      </div>
                      {inv.status === "OVERDUE" && (
                        <div className="mt-2">
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold text-red-700 bg-red-100">
                            {inv.daysOverdue} {inv.daysOverdue === 1 ? "day" : "days"} overdue
                          </span>
                        </div>
                      )}
                    </td>
                    <td className="px-8 py-6">{getStatusBadge(inv.status)}</td>
                    <td className="px-8 py-6">
                      {inv.status !== "PAID" && (
                        <button
                          onClick={() => {
                            setSelectedInv(inv);
                            setPaymentInput(remaining.toFixed(2));
                            setModalOpen(true);
                          }}
                          className="px-5 py-2.5 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition shadow-md"
                        >
                          Record Payment
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Payment Modal */}
        {modalOpen && selectedInv && (
          <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
              <h2 className="text-2xl font-bold mb-6">Record Payment</h2>
              <p className="text-lg font-medium text-blue-700 mb-6">Invoice #{selectedInv.invoiceNo}</p>
              <div className="space-y-4 mb-8 text-sm">
                <div>Total: <strong>${parseFloat(selectedInv.total).toFixed(2)}</strong></div>
                <div>Paid: <strong>${parseFloat(selectedInv.paidAmount || "0").toFixed(2)}</strong></div>
                <div className="text-amber-600 text-lg">
                  Remaining: <strong>${(parseFloat(selectedInv.total) - parseFloat(selectedInv.paidAmount || "0")).toFixed(2)}</strong>
                </div>
              </div>
              <input
                type="number"
                step="0.01"
                value={paymentInput}
                onChange={(e) => setPaymentInput(e.target.value)}
                className="w-full px-5 py-4 border-2 rounded-xl text-lg mb-6 focus:border-blue-500"
                placeholder="0.00"
              />
              <div className="flex justify-end gap-4">
                <button onClick={() => setModalOpen(false)} className="px-6 py-3 border-2 rounded-xl hover:bg-gray-50">
                  Cancel
                </button>
                <button onClick={recordPayment} className="px-8 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 font-medium">
                  Confirm Payment
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Due Date Edit Modal */}
        {editingDueDate && (
          <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
              <h2 className="text-2xl font-bold mb-6">Change Due Date</h2>
              <p className="text-lg font-medium text-blue-700 mb-6">Invoice #{editingDueDate.invoiceNo}</p>

              <div className="mb-8">
                <label className="block text-sm font-medium text-gray-700 mb-3">New Due Date</label>
                <input
                  type="date"
                  value={newDueDate}
                  onChange={(e) => setNewDueDate(e.target.value)}
                  className="w-full px-5 py-4 border-2 border-gray-300 rounded-xl text-lg focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-4">
                <button
                  onClick={() => {
                    setEditingDueDate(null);
                    setNewDueDate("");
                  }}
                  className="px-6 py-3 border-2 rounded-xl hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={saveNewDueDate}
                  className="px-8 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-medium"
                >
                  Save Due Date
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}