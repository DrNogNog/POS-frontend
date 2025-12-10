"use client";

import { useState, useEffect } from "react";
import Sidebar from "@/components/sidebar";
import {
  FileText,
  DollarSign,
  Calendar,
  CheckCircle2,
  Clock,
  AlertCircle,
} from "lucide-react";

interface BillingInvoice {
  id: number;
  invoiceNo: string;
  orderId: number;
  cost: string | number;
  amountPaid: string | number;
  paidAt?: string | null;
  createdAt: string;
}

export default function BillingInvoicesPage() {
  const [invoices, setInvoices] = useState<BillingInvoice[]>([]);
  const [loading, setLoading] = useState(true);

  // Helper: safely convert Prisma Decimal (string) → number
  const toNumber = (value: string | number | null | undefined): number => {
    if (value === null || value === undefined) return 0;
    return typeof value === "string" ? parseFloat(value) : Number(value);
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
  setLoading(true); // ← ADD THIS
  try {
    const res = await fetch("http://localhost:4000/api/billing");
    if (!res.ok) throw new Error("Failed to fetch");
    const data = await res.json();

    console.log("Fresh data from server:", data); // ← ADD THIS LOG

    const enriched = data.map((inv: any) => ({
      ...inv,
      amountPaid: inv.amountPaid ?? "0",
      paidAt: inv.paidAt ?? null,
    }));

    const sorted = enriched.sort(
      (a: any, b: any) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    setInvoices(sorted);
  } catch (err) {
    console.error("Failed to load invoices", err);
  } finally {
    setLoading(false);
  }
};

  // Totals
  const totalCost = invoices.reduce((sum, inv) => sum + toNumber(inv.cost), 0);
  const totalPaid = invoices.reduce(
    (sum, inv) => sum + toNumber(inv.amountPaid),
    0
  );
  const totalDue = totalCost - totalPaid;

  const getPaymentStatus = (invoice: BillingInvoice) => {
    const paid = toNumber(invoice.amountPaid);
    const total = toNumber(invoice.cost);

    if (paid >= total)
      return { label: "Paid", color: "bg-green-100 text-green-800", icon: CheckCircle2 };
    if (paid > 0)
      return { label: "Partial", color: "bg-yellow-100 text-yellow-800", icon: Clock };
    return { label: "Unpaid", color: "bg-red-100 text-red-800", icon: AlertCircle };
  };

  const handlePayment = async (invoiceId: number, amount: number) => {
    try {
      const res = await fetch(`http://localhost:4000/api/billing/${invoiceId}/pay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount }),
      });

      const data = await res.json();

      if (res.ok) {
        fetchInvoices();
        alert(data.message || "Payment successful!");
      } else {
        alert(data.error || "Payment failed");
      }
    } catch (err) {
      console.error(err);
      alert("Network error – check if backend is running");
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "—";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <Sidebar />
        <main className="flex-1 p-8 flex items-center justify-center">
          <div className="text-xl text-gray-600">Loading invoices...</div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 p-8">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-gray-900 flex items-center gap-3">
              <FileText className="w-10 h-10 text-blue-600" />
              Accounts Payable
            </h1>
            <p className="text-gray-600 mt-2">Manage vendor invoices and payment status</p>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-sm">Total Invoiced</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">
                    ${totalCost.toFixed(2)}
                  </p>
                </div>
                <FileText className="w-12 h-12 text-blue-500 opacity-60" />
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-sm">Total Paid</p>
                  <p className="text-3xl font-bold text-green-600 mt-1">
                    ${totalPaid.toFixed(2)}
                  </p>
                </div>
                <CheckCircle2 className="w-12 h-12 text-green-500 opacity-60" />
              </div>
            </div>

            <div className="bg-gradient-to-r from-red-500 to-pink-600 text-white rounded-xl shadow-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-red-100 text-sm">Amount Due</p>
                  <p className="text-4xl font-bold mt-1">${totalDue.toFixed(2)}</p>
                </div>
                <DollarSign className="w-14 h-14 text-red-200 opacity-70" />
              </div>
            </div>
          </div>

          {/* Invoices List */}
          <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
            {invoices.length === 0 ? (
              <div className="p-16 text-center">
                <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-xl text-gray-500">No invoices yet</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {invoices.map((invoice) => {
                  console.log("Invoice from API:", invoice);
                  const cost = toNumber(invoice.cost);
                  const paid = toNumber(invoice.amountPaid);
                  const remaining = cost - paid;
                  const Status = getPaymentStatus(invoice);

                  return (
                    <div key={invoice.id} className="p-6 hover:bg-gray-50 transition">
                      <div className="flex items-center justify-between gap-6">
                        <div className="flex-1 flex items-center gap-5">
                          <div className="bg-blue-100 p-3 rounded-lg">
                            <FileText className="w-6 h-6 text-blue-600" />
                          </div>
                          <div>
                            <div className="flex items-center gap-3">
                              <p className="text-xl font-bold text-blue-700">
                                {invoice.invoiceNo}
                              </p>
                              <span
                                className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${Status.color}`}
                              >
                                <Status.icon className="w-3.5 h-3.5" />
                                {Status.label}
                              </span>
                            </div>
                            <p className="text-sm text-gray-500">Order #{invoice.orderId}</p>
                            <p className="text-xs text-gray-400 mt-1">
                              Created: {formatDate(invoice.createdAt)}
                              {invoice.paidAt && ` • Paid: ${formatDate(invoice.paidAt)}`}
                            </p>
                          </div>
                        </div>

                        <div className="text-right">
                          <p className="text-2xl font-bold text-gray-900">
                            ${cost.toFixed(2)}
                          </p>
                          {paid > 0 && (
                            <p className="text-sm text-gray-600">
                              Paid:{" "}
                              <span className="font-medium text-green-600">
                                ${paid.toFixed(2)}
                              </span>
                            </p>
                          )}
                          {remaining > 0 && (
                            <p className="text-sm font-medium text-red-600">
                              Due: ${remaining.toFixed(2)}
                            </p>
                          )}
                        </div>

                        {/* Pay Buttons */}
                        {remaining > 0 && (
                          <div className="flex flex-col gap-2">
                            <button
                              onClick={() => handlePayment(invoice.id, remaining)}
                              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium transition"
                            >
                              Pay in Full
                            </button>
                            {remaining > 10 && (
                              <button
                                onClick={() => {
                                  const input = prompt(
                                    `Enter partial payment (max $${remaining.toFixed(2)}):`
                                  );
                                  const amount = input ? parseFloat(input) : 0;
                                  if (amount > 0 && amount <= remaining) {
                                    handlePayment(invoice.id, amount);
                                  } else if (input !== null) {
                                    alert("Invalid amount");
                                  }
                                }}
                                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium transition"
                              >
                                Partial Pay
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          {invoices.length > 0 && (
            <div className="mt-8 bg-gray-900 text-white rounded-xl p-6 text-center">
              <p className="text-lg">
                <span className="font-bold">{invoices.length}</span> invoice
                {invoices.length !== 1 ? "s" : ""} • Paid:{" "}
                <span className="font-bold text-green-400">
                  ${totalPaid.toFixed(2)}
                </span>{" "}
                • Due:{" "}
                <span className="font-bold text-red-400">
                  ${totalDue.toFixed(2)}
                </span>
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}