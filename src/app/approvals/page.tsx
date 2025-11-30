"use client";

import { useState, useEffect } from "react";
import Sidebar from "@/components/sidebar";
import { format } from "date-fns";
import { generateInvoicePdf } from "@/lib/generateInvoicePdf";
import { Payload, ItemRow } from "@/types/estimate";
import { parseISO } from "date-fns/parseISO";

type Estimate = {
  id: number;
  estimateNo: string;
  date: string;
  total: number;
  approved: boolean;
  invoiced?: boolean; // ✅ added
  billTo?: string;
  shipTo?: string;
  subtotal?: number;
  discount?: number;
  items?: ItemRow[];
  tax?: number;
  companyName?: string;
  companyAddr1?: string;
  phone?: string;
  email?: string;
  website?: string;
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
    if (!res.ok) throw new Error();
    const data = await res.json();
    console.log("Fetched estimates:", data); // ✅ log
    setEstimates(data);
  } catch {
    alert("Failed to load estimates — is backend running?");
  } finally {
    setLoading(false);
  }
}


  async function toggleApproved(id: number, approved: boolean) {
    await fetch(`http://localhost:4000/api/estimates/${id}/approve`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ approved: !approved }),
    });
    fetchEstimates();
  }

  async function deleteEstimate(id: number, estimateNo: string) {
    if (!confirm(`Delete Estimate ${estimateNo}?`)) return;

    const res = await fetch(`http://localhost:4000/api/estimates/${id}`, {
      method: "DELETE",
    });

    if (res.ok) {
      alert(`Deleted ${estimateNo}`);
      fetchEstimates();
    } else {
      alert("Failed to delete.");
    }
  }

  function viewEstimate(id: number) {
    window.open(
      `http://localhost:4000/api/estimates/${id}/pdf`,
      "_blank",
      "noopener,noreferrer"
    );
  }

 async function createInvoice(estimate: Estimate) {
  if (!estimate.approved) {
    alert("Approve the estimate first.");
    return;
  }

  if (!confirm(`Create invoice from ${estimate.estimateNo}?`)) return;

  try {
    // Fetch full estimate
    const res = await fetch(`http://localhost:4000/api/estimates/${estimate.id}`);
    if (!res.ok) throw new Error("Failed to fetch full estimate");
    const full: Estimate = await res.json();

    // Prepare invoice items
    const invoiceItems = (full.items && full.items.length > 0
      ? full.items
      : undefined
    )?.map((item) => ({
      item: item.item,
      description: item.description || item.item,
      qty: Number(item.qty) || 0,
      rate: Number(item.rate) || 0,
      amount: (Number(item.qty) || 0) * (Number(item.rate) || 0),
    })) ?? [
      {
        item: `From Estimate #${estimate.estimateNo}`,
        description: `From Estimate #${estimate.estimateNo}`,
        qty: 1,
        rate: Number(estimate.total) || 0,
        amount: Number(estimate.total) || 0,
      },
    ];

    const subtotal = invoiceItems.reduce((acc, i) => acc + i.amount, 0);
    const discount = Number(full.discount) || 0;
    const tax = Number(full.tax) || 0;
    const total = subtotal - discount + tax;

    const invoiceNo = estimate.estimateNo.replace("EST", "INV");
    const today = new Date().toISOString().slice(0, 10);
    const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    const invoiceData: Payload = {
      invoiceNo,
      date: today,
      time,
      companyName: full.companyName || "",
      companyAddr1: full.companyAddr1 || "",
      phone: full.phone || "",
      email: full.email || "",
      website: full.website || "",
      billTo: full.billTo || "",
      shipTo: full.shipTo || "",
      items: invoiceItems,
      subtotal,
      discount,
      tax,
      total,
    };

    // Generate PDF
    const pdfBytes = await generateInvoicePdf(invoiceData);

    // Convert to Base64 safely
    const base64Pdf = Buffer.from(pdfBytes).toString("base64");

    // Log payload before sending
    console.log("Sending invoice POST:", {
      invoiceNo,
      pdfLength: base64Pdf.length,
    });

    // POST invoice to backend
    const postRes = await fetch("http://localhost:4000/api/invoices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ invoiceNo, pdf: base64Pdf }),
    });

    if (!postRes.ok) {
      const errText = await postRes.text();
      throw new Error(`Invoice POST failed: ${postRes.status} - ${errText}`);
    }

    // Mark estimate as invoiced
    await fetch(`http://localhost:4000/api/estimates/${estimate.id}/invoiced`, {
      method: "PATCH",
    });

    alert(`Invoice ${invoiceNo} created & saved!`);
    fetchEstimates();
  } catch (err) {
    console.error("Failed to create invoice:", err);
    alert("Failed to create invoice. Check console for details.");
  }
}



  if (loading) return <div className="p-8 text-lg">Loading...</div>;

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 p-8">
        <h1 className="text-3xl font-bold mb-8 text-gray-800">List of Estimates</h1>

        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-indigo-600 text-white">
              <tr>
                <th className="px-6 py-4 text-left">Estimate #</th>
                <th className="px-6 py-4 text-left">Date</th>
                <th className="px-6 py-4 text-left">Customer</th>
                <th className="px-6 py-4 text-right">Total</th>
                <th className="px-6 py-4 text-center">Approved</th>
                <th className="px-6 py-4 text-center">Invoiced</th> {/* ✅ new column */}
                <th className="px-6 py-4 text-center">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-200">
              {estimates.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-20 text-center text-gray-500 text-lg">
                    No estimates yet.
                  </td>
                </tr>
              ) : (
                estimates.map((est) => (
                  <tr key={est.id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4 text-indigo-600 font-medium">{est.estimateNo}</td>
                    <td className="px-6 py-4 text-gray-600">
                      {format(parseISO(est.date), "MMM dd, yyyy")}
                    </td>
                    <td className="px-6 py-4">{est.billTo}</td>
                    <td className="px-6 py-4 text-right font-semibold text-green-600">
                      ${est.total.toFixed(2)}
                    </td>

                    <td className="px-6 py-4 text-center">
                      <input
                        type="checkbox"
                        checked={est.approved}
                        onChange={() => toggleApproved(est.id, est.approved)}
                        className="w-5 h-5 text-indigo-600 cursor-pointer"
                      />
                    </td>

                    <td className="px-6 py-4 text-center">
                    {est.invoiced === true ? (
                      <span className="text-green-600 font-semibold">Yes</span>
                    ) : (
                      <span className="text-gray-500">No</span>
                    )}
                  </td>

                    <td className="px-6 py-4 text-center">
                      <div className="flex justify-center gap-2">
                        <button
                          onClick={() => viewEstimate(est.id)}
                          className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                        >
                          View PDF
                        </button>

                        <button
                          onClick={() => createInvoice(est)}
                          disabled={!est.approved || est.invoiced} // disable if already invoiced
                          className={`px-4 py-2 text-sm rounded ${
                            est.approved && !est.invoiced
                              ? "bg-indigo-600 text-white hover:bg-indigo-700"
                              : "bg-gray-300 text-gray-500 cursor-not-allowed"
                          }`}
                        >
                          Create Invoice
                        </button>

                        <button
                          onClick={() => deleteEstimate(est.id, est.estimateNo)}
                          className="px-4 py-2 bg-red-600 text-white rounded text-sm hover:bg-red-700"
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
