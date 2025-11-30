"use client";

import { useState, useEffect } from "react";
import Sidebar from "@/components/sidebar";

type Invoice = {
  id: number;
  invoiceNo: string;
  createdAt: string;
};

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [pdfLoading, setPdfLoading] = useState<number | null>(null); // track which PDF is loading
  const [deleteLoading, setDeleteLoading] = useState<number | null>(null); // track which invoice is deleting

  useEffect(() => {
    fetchInvoices();
  }, []);

  // Fetch list of invoices
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

  // Convert Base64 string to Blob
  function base64ToBlob(base64: string, type = "application/pdf") {
    if (typeof base64 !== "string") {
      throw new Error("PDF data is not a string");
    }
    const cleaned = base64.replace(/\s/g, "");
    const base64String = cleaned.replace(/-/g, "+").replace(/_/g, "/");

    const binary = atob(base64String);
    const array = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      array[i] = binary.charCodeAt(i);
    }
    return new Blob([array], { type });
  }

  // Open PDF in new tab
  async function viewPDF(invoiceId: number) {
    setPdfLoading(invoiceId);
    try {
      const res = await fetch(`http://localhost:4000/api/invoices/${invoiceId}`);
      if (!res.ok) throw new Error("Failed to fetch PDF");

      const data: { pdf?: Record<number, number> } = await res.json();
      if (!data.pdf) throw new Error("Invalid or missing PDF data");

      const byteKeys = Object.keys(data.pdf).map(Number).sort((a, b) => a - b);
      const byteArray = new Uint8Array(byteKeys.length);
      byteKeys.forEach((k, i) => {
        byteArray[i] = data.pdf[k];
      });

      const blob = new Blob([byteArray], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
    } catch (err) {
      console.error(err);
      alert("Failed to load PDF: " + (err instanceof Error ? err.message : err));
    } finally {
      setPdfLoading(null);
    }
  }

  // Delete invoice with confirmation
  async function handleDelete(invoiceId: number) {
    const confirmed = confirm("Are you sure you want to delete this invoice?");
    if (!confirmed) return;

    setDeleteLoading(invoiceId);
    try {
      const res = await fetch(`http://localhost:4000/api/invoices/${invoiceId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete invoice");

      // Remove deleted invoice from state
      setInvoices((prev) => prev.filter((inv) => inv.id !== invoiceId));
    } catch (err) {
      console.error(err);
      alert("Failed to delete invoice: " + (err instanceof Error ? err.message : err));
    } finally {
      setDeleteLoading(null);
    }
  }

  if (loading) return <div className="p-8 text-lg">Loading invoices...</div>;

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 p-6 bg-gray-50 dark:bg-gray-900">
        <h1 className="text-2xl font-bold mb-4 text-gray-800 dark:text-gray-200">
          Invoices
        </h1>

        <div className="bg-white rounded-xl shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-indigo-600 text-white">
              <tr>
                <th className="px-6 py-4 text-left">Invoice #</th>
                <th className="px-6 py-4 text-left">Created At</th>
                <th className="px-6 py-4 text-left">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {invoices.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-6 py-20 text-center text-gray-500">
                    No invoices yet.
                  </td>
                </tr>
              ) : (
                invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4 text-indigo-600 font-medium">{inv.invoiceNo}</td>
                    <td className="px-6 py-4">{new Date(inv.createdAt).toLocaleDateString()}</td>
                    <td className="px-6 py-4 space-x-2">
                      <button
                        onClick={() => viewPDF(inv.id)}
                        disabled={pdfLoading === inv.id}
                        className={`px-4 py-2 text-white rounded text-sm ${
                          pdfLoading === inv.id
                            ? "bg-gray-400 cursor-not-allowed"
                            : "bg-blue-600 hover:bg-blue-700"
                        }`}
                      >
                        {pdfLoading === inv.id ? "Loading..." : "View PDF"}
                      </button>

                      <button
                        onClick={() => handleDelete(inv.id)}
                        disabled={deleteLoading === inv.id}
                        className={`px-4 py-2 text-white rounded text-sm ${
                          deleteLoading === inv.id
                            ? "bg-gray-400 cursor-not-allowed"
                            : "bg-red-600 hover:bg-red-700"
                        }`}
                      >
                        {deleteLoading === inv.id ? "Deleting..." : "Delete"}
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
