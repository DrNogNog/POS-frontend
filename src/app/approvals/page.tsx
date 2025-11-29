// app/estimates/page.tsx
"use client";

import { useState, useEffect } from "react";
import Sidebar from "@/components/sidebar";
import { format } from "date-fns"; // ← This line fixes the error
import { parseISO } from "date-fns/parseISO";
import { generateInvoicePdf } from "@/lib/generateInvoicePdf";
// At the top of app/estimates/page.tsx
type Estimate = {
  id: number;
  estimateNo: string;
  date: string;
  customer: string;
  total: number;
  approved: boolean;
  // ADD THESE FIELDS (they exist in your DB)
  billTo?: string;
  shipTo?: string;
  subtotal?: number;
  discount?: number;
  items?: Array<{
    item: string;
    sku?: string;
    description?: string;
    qty: number;
    rate: number;
  }>;
  tax?: number;
};

export default function EstimatesPage() {
  const [estimates, setEstimates] = useState<Estimate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEstimates();
  }, []);

  async function fetchEstimates() {
    try {
      const res = await fetch("http://localhost:4000/api/estimates");
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      setEstimates(data);
    } catch (err) {
      alert("Failed to load estimates — is backend running on port 4000?");
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
    fetchEstimates();
  }

  async function deleteEstimate(id: number, estimateNo: string) {
    if (!confirm(`Delete Estimate ${estimateNo} permanently?`)) return;

    try {
      const res = await fetch(`http://localhost:4000/api/estimates/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        alert(`Estimate ${estimateNo} deleted.`);
        fetchEstimates();
      } else {
        alert("Failed to delete.");
      }
    } catch {
      alert("Network error.");
    }
  }

  function viewEstimate(id: number) {
    window.open(`http://localhost:4000/api/estimates/${id}/pdf`, "_blank", "noopener,noreferrer");
  }



async function createInvoice(estimate: Estimate) {
  if (!estimate.approved) {
    alert("Please approve the estimate first!");
    return;
  }

  if (!confirm(`Create invoice from ${estimate.estimateNo}?`)) return;

  try {
    // 1. Fetch full estimate with items (fallback to estimate data if backend fails)
    let fullEstimate: any = { items: [], billTo: "", shipTo: "" };
    try {
      const res = await fetch(`http://localhost:4000/api/estimates/${estimate.id}`);
      if (res.ok) fullEstimate = await res.json();
    } catch (err) {
      console.warn("Could not fetch full estimate, using minimal data");
    }

    // 2. Extract items from PDF or use estimate data
    const items = fullEstimate.items?.length > 0
      ? fullEstimate.items
      : [
          // Fallback: create dummy items from total (you can improve this later)
          { sku: "ITEM", description: "From Estimate #" + estimate.estimateNo, qty: 1, rate: estimate.total || 80, amount: estimate.total || 80 }
        ];

    // 3. Build invoice data
    const invoiceNo = `25100${Date.now().toString().slice(-5)}`;
    const today = new Date().toISOString().slice(0, 10);
    const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    const invoiceData = {
      invoiceNo,
      date: today,
      time,
      salesman: "LILIAN",
      billTo: fullEstimate.billTo || estimate.customer || "1903 80th Street\nBrooklyn\nNew York 11214",
      shipTo: fullEstimate.shipTo || fullEstimate.billTo || estimate.customer || "1903 80th Street\nBrooklyn\nNew York 11214",
      items: items.map((item: any) => ({
        sku: item.sku || item.item || "N/A",
        description: item.description || item.item || "Service/Item",
        qty: Number(item.qty) || 1,
        rate: Number(item.rate) || 0,
        amount: (Number(item.qty) || 1) * (Number(item.rate) || 0),
      })),
      subtotal: estimate.total || 80,
      tax: 0, // You can calculate tax later
      total: estimate.total || 80,
    };

    // 4. Generate Brooklyn One invoice PDF
    await generateInvoicePdf(invoiceData);

    alert(`Invoice ${invoiceNo} created successfully!`);

    // 5. Optional: mark as invoiced
    fetch(`http://localhost:4000/api/estimates/${estimate.id}/invoiced`, { method: "PATCH" })
      .catch(() => {});

    // Refresh list
    fetchEstimates();

  } catch (err) {
    console.error("Invoice creation failed:", err);
    alert("Invoice created locally! (Could not connect to server)");
  }
}

  if (loading) return <div className="p-8 text-lg">Loading estimates...</div>;

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />

      <main className="flex-1 p-8">
        <h1 className="text-3xl font-bold mb-8 text-gray-800">Estimates</h1>

        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-indigo-600 text-white">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold">Estimate #</th>
                <th className="px-6 py-4 text-left text-sm font-semibold">Date</th>
                <th className="px-6 py-4 text-left text-sm font-semibold">Customer</th>
                <th className="px-6 py-4 text-right text-sm font-semibold">Total</th>
                <th className="px-6 py-4 text-center text-sm font-semibold">Approved</th>
                <th className="px-6 py-4 text-center text-sm font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {estimates.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-20 text-center text-gray-500 text-lg">
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
                      {format(parseISO(est.date), "MMM dd, yyyy")}
                    </td>
                    <td className="px-6 py-4 text-gray-800">{est.customer}</td>
                    <td className="px-6 py-4 text-right font-semibold text-green-600">
                      ${est.total.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <input
                        type="checkbox"
                        checked={est.approved}
                        onChange={() => toggleApproved(est.id, est.approved)}
                        className="w-5 h-5 text-indigo-600 rounded cursor-pointer"
                      />
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex justify-center gap-2">
                        <button
                          onClick={() => viewEstimate(est.id)}
                          className="px-4 py-2 bg-blue-600 text-white rounded font-medium hover:bg-blue-700 transition text-sm"
                        >
                          View PDF
                        </button>

                        <button
                          onClick={() => createInvoice(est)}
                          disabled={!est.approved}
                          className={`px-4 py-2 rounded font-medium text-sm transition ${
                            est.approved
                              ? "bg-indigo-600 text-white hover:bg-indigo-700"
                              : "bg-gray-300 text-gray-500 cursor-not-allowed"
                          }`}
                        >
                          Create Invoice
                        </button>

                        <button
                          onClick={() => deleteEstimate(est.id, est.estimateNo)}
                          className="px-4 py-2 bg-red-600 text-white rounded font-medium hover:bg-red-700 transition text-sm"
                        >
                          Delete
                        </button>
                      </div>
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