// app/billing-invoices/page.tsx
"use client";

import { useState, useEffect } from "react";
import Sidebar from "@/components/sidebar";
import { FileText, DollarSign, Calendar } from "lucide-react";

interface BillingInvoice {
  id: number;
  invoiceNo: string;
  orderId: number;
  cost: number;
  createdAt: string;
}

export default function BillingInvoicesPage() {
  const [invoices, setInvoices] = useState<BillingInvoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    try {
      const res = await fetch("http://localhost:4000/api/billing");
      const data = await res.json();
      const sorted = data.sort((a: any, b: any) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      setInvoices(sorted);
    } catch (err) {
      console.error("Failed to load invoices");
    } finally {
      setLoading(false);
    }
  };

  const totalCost = invoices.reduce((sum, inv) => sum + Number(inv.cost || 0), 0);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
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
        <div className="max-w-5xl mx-auto">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-gray-900 flex items-center gap-3">
              <FileText className="w-10 h-10 text-blue-600" />
              All Billing Invoices
            </h1>
            <p className="text-gray-600 mt-2">All purchase invoices with real costs</p>
          </div>

          {/* Total Cost Card */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-2xl shadow-lg p-8 mb-8">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-lg">Total Cost of All Invoices</p>
                <p className="text-5xl font-bold mt-2">
                  ${totalCost.toFixed(2)}
                </p>
              </div>
              <DollarSign className="w-20 h-20 text-blue-300 opacity-50" />
            </div>
            <p className="mt-4 text-blue-100">
              {invoices.length} invoice{invoices.length !== 1 ? "s" : ""}
            </p>
          </div>

          {/* Invoices List */}
          <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
            {invoices.length === 0 ? (
              <div className="p-16 text-center">
                <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-xl text-gray-500">No invoices yet</p>
                <p className="text-gray-400 mt-2">Create your first purchase order to see it here</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {invoices.map((invoice) => (
                  <div key={invoice.id} className="p-6 hover:bg-gray-50 transition">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-4">
                          <div className="bg-blue-100 p-3 rounded-lg">
                            <FileText className="w-6 h-6 text-blue-600" />
                          </div>
                          <div>
                            <p className="text-xl font-bold text-blue-700">
                              {invoice.invoiceNo}
                            </p>
                            <p className="text-sm text-gray-500">
                              Order #{invoice.orderId}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <p className="text-3xl font-bold text-gray-900">
                          ${Number(invoice.cost).toFixed(2)}
                        </p>
                        <p className="text-sm text-gray-500 flex items-center justify-end gap-1 mt-1">
                          <Calendar className="w-4 h-4" />
                          {formatDate(invoice.createdAt)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer Summary */}
          {invoices.length > 0 && (
            <div className="mt-8 text-center">
              <p className="text-lg text-gray-600">
                <span className="font-bold">{invoices.length}</span> invoice{invoices.length !== 1 ? "s" : ""} • 
                Total: <span className="font-bold text-2xl text-blue-600">${totalCost.toFixed(2)}</span>
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}