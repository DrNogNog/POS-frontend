"use client";

import { useState, useEffect } from "react";
import Sidebar from "@/components/sidebar";
import { format } from "date-fns";
import { parseISO } from "date-fns/parseISO";
import { generateInvoicePdf } from "@/lib/generateInvoicePdf";
import { Payload } from "@/types/estimate";

interface Product {
  id: number;
  name: string;
  sku?: string | null;
  price: number;
  stock: number;
}

interface EstimateItem {
  item: string;
  description?: string;
  qty: number | string;
  rate: number | string;
}

interface Estimate {
  id: number;
  estimateNo: string;
  approved: boolean;
  items: EstimateItem[];
  discount?: number;
  tax?: number;
  total?: number;
  companyName?: string;
  companyAddr1?: string;
  phone?: string;
  email?: string;
  website?: string;
  billTo?: string;
  shipTo?: string;
  invoiced?: boolean;
  date: string;
}

interface InvoiceItem {
  productId: number;
  sku: string;
  description: string;
  qty: number;
  rate: number;
  amount: number;
}

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

      // Fetch all products
      const productsRes = await fetch("http://localhost:4000/api/products");
      if (!productsRes.ok) throw new Error("Failed to fetch products");
      const products: Product[] = await productsRes.json();
      console.log("Products fetched:", full.items);
      // Map estimate items to products
      const invoiceItems: InvoiceItem[] = (full.items || [])
    .map((i: EstimateItem & { sku?: string }) => {
      const qty = Number(i.qty);
      if (!i.sku || !qty || qty <= 0) return null;
      const searchKey = i.sku || i.item;
      const product = products.find(
      (p) => p.sku?.trim() === searchKey.trim() || p.name.trim() === searchKey.trim()
    );
      if (!product) return null;

      if (product.stock < qty) {
        alert(`Insufficient stock for "${product.sku || product.name}"`);
      }

      return {
        productId: product.id,
        sku: product.sku || product.name,
        description: i.description || product.name,
        qty,
        rate: Number(i.rate) || product.price,
        amount: qty * (Number(i.rate) || product.price),
      };
    })
    .filter((item): item is InvoiceItem => item !== null);

      console.log("Invoice items prepared:", invoiceItems);
      if (invoiceItems.length === 0) {
        alert("No valid products in this estimate. Cannot create invoice.");
        return;
      }

      // Decrement stock
      const productsToDecrement = invoiceItems.map((i) => ({
        sku: i.sku,
        qty: i.qty,
      }));
      console.log(productsToDecrement)

      const stockRes = await fetch("http://localhost:4000/api/products/decrement-stock", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: productsToDecrement }),
      });

      if (!stockRes.ok) {
        const errText = await stockRes.text();
        throw new Error(`Stock update failed: ${errText}`);
      }

      // Calculate totals
      const subtotal = invoiceItems.reduce((acc, i) => acc + i.amount, 0);
      const discount = Number(full.discount) || 0;
      const tax = Number(full.tax) || 0;
      const total = subtotal - discount + tax;

      // Generate invoice data
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
      const base64Pdf = Buffer.from(pdfBytes).toString("base64");

      // Save invoice PDF
      const postRes = await fetch("http://localhost:4000/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invoiceNo, pdf: base64Pdf }),
      });

      if (!postRes.ok) {
        const errText = await postRes.text();
        throw new Error(`Invoice POST failed: ${errText}`);
      }

      // Mark estimate as invoiced
      await fetch(`http://localhost:4000/api/estimates/${estimate.id}/invoiced`, {
        method: "PATCH",
      });

      alert(`Invoice ${invoiceNo} created, saved, and stock updated!`);
      fetchEstimates();
    } catch (err) {
      console.error("Failed to create invoice:", err);
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
                <th className="px-6 py-4 text-center">Invoiced</th>
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
                      ${est.total?.toFixed(2)}
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
                      {est.invoiced ? (
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
                          disabled={!est.approved || est.invoiced}
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
