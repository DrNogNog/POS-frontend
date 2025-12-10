"use client";

import { useState, useEffect } from "react";
import Sidebar from "@/components/sidebar";
import { format } from "date-fns";
import { generateInvoicePdf } from "@/lib/generateInvoicePdf";
import { Payload } from "@/types/estimate";

interface Product {
  id: number;
  name: string;
  description: string;
  inputcost: number;
  stock: number;
  images: string[];
  vendors: string[];
  needToOrder: number;
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
      // 1. Fetch full estimate
      const res = await fetch(`http://localhost:4000/api/estimates/${estimate.id}`);
      if (!res.ok) throw new Error("Failed to fetch full estimate");
      const full: Estimate = await res.json();

      // 2. Fetch all products once
      const productsRes = await fetch("http://localhost:4000/api/products");
      if (!productsRes.ok) throw new Error("Failed to fetch products");
      const products: Product[] = await productsRes.json();
      console.log("here", products)
      // 3. Resolve items → products (with fallback for old format)
            // 3. Resolve items → products (supports old & new formats)
      // Replace your entire resolvedItems block with this:
            // FINAL VERSION – works with your real data (uses products.name correctly)
      const resolvedItems = (full.items || [])
  .map((i: any) => {
    const qty = Number(i.qty);
    const rate = Number(i.rate || i.inputcost);
    if (isNaN(qty) || qty <= 0 || isNaN(rate)) return null;

    // Always convert SKU/item to uppercase for consistent search
    const productIdentifier = (i.sku || i.item || "").toString().trim().toUpperCase();
    if (!productIdentifier) return null;

    // Find product where product.name (also uppercased) matches
    const product = products.find(
      (p) => p.name.trim().toUpperCase() === productIdentifier
    );

    if (!product) {
      throw new Error(
        `Product not found in inventory!\n` +
        `SKU/Item: "${productIdentifier}"\n` +
        `Line: ${JSON.stringify(i)}\n\n` +
        `Available product names (SKUs): ${products.map(p => p.name).join(', ')}`
      );
    }

    return {
      product,                                    
      qty,
      rate,
      description: i.description || product.description || product.name,
    };
  })
  .filter(Boolean) as {
    product: Product;
    qty: number;
    rate: number;
    description: string;
  }[];


      if (resolvedItems.length === 0) {
        alert("No valid items found to invoice.");
        return;
      }

      // 4. Build invoice items for PDF
      const invoiceItems: InvoiceItem[] = resolvedItems.map(
        ({ product, qty, rate, description }) => ({
          productId: product.id,
          description,
          qty,
          rate,
          amount: qty * rate,
        })
      );

      // 5. Build stock decrement payload — using the already-resolved product
     const productsToDecrement = resolvedItems.map(({ product, qty }) => ({
      name: product.name.trim(),
      quantity: Number(qty),  // ← THIS FIXES 95% OF 500 ERRORS
    }));

    const stockRes = await fetch("http://localhost:4000/api/products/decrement-stock", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: productsToDecrement }),
    });

    if (!stockRes.ok) {
      const err = await stockRes.text();
      throw new Error(`Stock update failed: ${err}`);
    }

      // 7. Calculate totals
      const subtotal = invoiceItems.reduce((acc, i) => acc + i.amount, 0);
      const discount = Number(full.discount) || 0;
      const taxRate = full.tax ? Number(full.tax) / 100 : 0.08875;
      const tax = (subtotal - discount) * taxRate;
      const total = subtotal - discount + tax;

      // 8. Generate invoice number and PDF
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
        subtotal: Number(subtotal.toFixed(2)),
        discount: Number(discount.toFixed(2)),
        tax: Number(tax.toFixed(2)),
        total: Number(total.toFixed(2)),
      };

      const pdfBytes = await generateInvoicePdf(invoiceData);
      const base64Pdf = Buffer.from(pdfBytes).toString("base64");

      // 9. Save invoice
      const postRes = await fetch("http://localhost:4000/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoiceNo,
          total: invoiceData.total,
          pdf: base64Pdf,
        }),
      });

      if (!postRes.ok) {
        const errText = await postRes.text();
        throw new Error(`Failed to save invoice: ${errText}`);
      }

      // 10. Mark estimate as invoiced
      await fetch(`http://localhost:4000/api/estimates/${estimate.id}/invoiced`, {
        method: "PATCH",
      });

      alert(`Invoice ${invoiceNo} created and stock updated successfully!`);
      fetchEstimates();
    } catch (err: any) {
      console.error("Failed to create invoice:", err);
      alert(err.message || "Failed to create invoice.");
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
                      {format(new Date(est.date), "MMM dd, yyyy")}
                    </td>
                    <td className="px-6 py-4">{est.billTo || "-"}</td>
                    <td className="px-6 py-4 text-right font-semibold text-green-600">
                      ${est.total?.toFixed(2) ?? "0.00"}
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
                      {est.invoiced ? (
                        <span className="text-green-600 font-semibold">Yes</span>
                      ) : (
                        <span className="text-gray-500">No</span>
                      )}
                    </td>

                    <td className="px-6 py-4 text-center">
                      <div className="flex justify-center gap-3">
                        <button
                          onClick={() => viewEstimate(est.id)}
                          className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition"
                        >
                          View PDF
                        </button>

                        <button
                          onClick={() => createInvoice(est)}
                          disabled={!est.approved || est.invoiced}
                          className={`px-4 py-2 text-sm rounded transition ${
                            est.approved && !est.invoiced
                              ? "bg-indigo-600 text-white hover:bg-indigo-700"
                              : "bg-gray-300 text-gray-500 cursor-not-allowed"
                          }`}
                        >
                          Create Invoice
                        </button>

                        <button
                          onClick={() => deleteEstimate(est.id, est.estimateNo)}
                          className="px-4 py-2 bg-red-600 text-white rounded text-sm hover:bg-red-700 transition"
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