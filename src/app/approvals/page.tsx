// app/estimates/page.tsx
"use client";

import { useState, useEffect } from "react";
import Sidebar from "@/components/sidebar";
import { format } from "date-fns";

type Estimate = {
  id: number;
  estimateNo: string;
  date: string;
  customer: string;
  total: number;
  pdfData: string; // base64
  approved: boolean; // we'll add this field in a sec
};

export default function ApprovalPage() {
  const [estimates, setEstimates] = useState<Estimate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEstimates();
  }, []);

  async function fetchEstimates() {
    try {
      const res = await fetch("http://localhost:4000/api/estimates");
      const data = await res.json();
      setEstimates(data);
    } catch (err) {
      alert("Failed to load estimates");
    } finally {
      setLoading(false);
    }
  }

  async function toggleApproved(id: number, current: boolean) {
  await fetch(`http://localhost:4000/api/estimates/${id}/approve`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ approved: !current }),
  });

  fetchEstimates(); // ← keeps list up to date
}

  async function createInvoice(estimate: Estimate) {
    if (!estimate.approved) {
      alert("Please approve the estimate first!");
      return;
    }

    const confirmed = confirm(
      `Create invoice from ${estimate.estimateNo} for $${estimate.total.toFixed(2)}?`
    );
    if (!confirmed) return;

    try {
      const res = await fetch("http://localhost:4000/api/invoices/from-estimate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estimateId: estimate.id }),
      });

      if (res.ok) {
        const invoice = await res.json();
        alert(`Invoice #${invoice.invoiceNo} created successfully!`);
        // Optional: open invoice PDF
        window.open(`/invoices/${invoice.id}`, "_blank");
      }
    } catch (err) {
      alert("Failed to create invoice");
    }
  }

  if (loading) return <div className="p-8">Loading estimates...</div>;

  return (
    <div className="flex min-h-screen">
      <Sidebar />

      <main className="flex-1 p-8 bg-gray-50 w-full">
        <h1 className="text-3xl font-bold mb-8">Estimates</h1>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-100 border-b-2 border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Estimate #</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Date</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Customer</th>
                <th className="px-6 py-4 text-right text-sm font-semibold text-gray-700">Total</th>
                <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700">Approved</th>
                <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {estimates.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    No estimates yet. Create one from the Invoices page!
                  </td>
                </tr>
              ) : (
                estimates.map((est) => (
                  <tr key={est.id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4 font-medium text-indigo-600">
                      {est.estimateNo}
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      {format(new Date(est.date), "MMM dd, yyyy")}
                    </td>
                    <td className="px-6 py-4 text-gray-800">{est.customer}</td>
                    <td className="px-6 py-4 text-right font-semibold">
                      ${est.total.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <input
                        type="checkbox"
                        checked={est.approved || false}
                        onChange={() => toggleApproved(est.id, est.approved || false)}
                        className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500 cursor-pointer"
                      />
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => createInvoice(est)}
                        disabled={!est.approved}
                        className={`px-5 py-2 rounded font-medium transition ${
                          est.approved
                            ? "bg-indigo-600 text-white hover:bg-indigo-700"
                            : "bg-gray-200 text-gray-400 cursor-not-allowed"
                        }`}
                      >
                        Create Invoice
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}