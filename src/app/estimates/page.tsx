"use client";

import React, { useCallback, useState } from "react";
import Sidebar from "@/components/sidebar";
import { generateEstimatePdf } from "@/lib/generateEstimatePdf";

type ItemRow = {
  sku: string;
  qty: number | "";
  description: string;
  baseRate: number | ""; // cost from product
  rate: number | ""; // final selling price (editable)
};

type Product = {
  id: number;
  name: string;
  sku: string;
  description: string;
  inputcost: number;
  vendors: string[];
};

interface InvoiceItem {
  productId: number;
  description: string;
  qty: number;
  rate: number;
  amount: number;
}

type MarkupKey = "AA" | "A" | "B" | "C" | "D";

const MARKUP_RATES: Record<MarkupKey, number> = {
  AA: 0.0,
  A: 0.5,
  B: 0.6,
  C: 0.7,
  D: 0.8,
};

const makeEmptyRow = (): ItemRow => ({
  sku: "",
  qty: "",
  description: "",
  baseRate: "",
  rate: "",
});

export default function InvoicesPage() {
  // Company fields
  const [companyName, setCompanyName] = useState("");
  const [companyAddr1, setCompanyAddr1] = useState("");
  const [companyAddr2, setCompanyAddr2] = useState("");
  const [phone, setPhone] = useState("");
  const [fax, setFax] = useState("");
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [date, setDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [estimateNo, setEstimateNo] = useState("");
  const [billTo, setBillTo] = useState("");
  const [shipTo, setShipTo] = useState("");

  // Items
  const [items, setItems] = useState<ItemRow[]>(Array.from({ length: 10 }, () => makeEmptyRow()));

  // Pricing controls
  const [markupTier, setMarkupTier] = useState<MarkupKey>("AA");
  const [discountPercent, setDiscountPercent] = useState<number | "">("");

  // Helper: fixed numbers
  const toFixedNumber = (v: number | string, places = 2): number => {
    const num = Number(v);
    return Number.isNaN(num) ? 0 : Number(num.toFixed(places));
  };

  // Compute expected rate
  const computeExpectedRate = useCallback(
    (baseRate: number | "", tier?: MarkupKey): number => {
      const markup = tier ? MARKUP_RATES[tier] : MARKUP_RATES[markupTier];
      const cost = typeof baseRate === "number" ? baseRate : Number(baseRate || 0);
      return toFixedNumber(cost * (1 + markup));
    },
    [markupTier]
  );

  // Update row with SKU search
  const updateRow = useCallback(
    async (index: number, field: keyof ItemRow, value: string | number) => {
      if (field === "sku") {
        const skuVal = String(value || "").trim();

        // Fetch matching product from backend
        let found: Product | undefined;
        if (skuVal) {
          try {
            const res = await fetch(`http://localhost:4000/api/products/search?query=${skuVal}`);
            const data = await res.json();
            found = Array.isArray(data.products) && data.products.length > 0 ? data.products[0] : undefined;
          } catch (err) {
            console.error("Error searching product:", err);
          }
        }

        setItems((prev) =>
          prev.map((r, i) => {
            if (i !== index) return r;
            return found
              ? {
                  ...r,
                  sku: skuVal,
                  description: found.description || "",
                  baseRate: found.inputcost,
                  rate: computeExpectedRate(found.inputcost),
                }
              : { ...r, sku: skuVal, description: "", baseRate: "", rate: "" };
          })
        );

        return;
      }

      // Other fields
      setItems((prev) =>
        prev.map((r, i) => {
          if (i !== index) return r;
          if (field === "description") return { ...r, description: String(value) };
          if (field === "qty") return { ...r, qty: value === "" ? "" : Number(value) };
          if (field === "rate") return { ...r, rate: value === "" ? "" : toFixedNumber(Number(value)) };
          return r;
        })
      );
    },
    [computeExpectedRate]
  );

  // Markup tier change
  const handleMarkupChange = useCallback(
    (nextTier: MarkupKey) => {
      setMarkupTier(nextTier);
      setItems((prev) =>
        prev.map((row) => {
          const baseIsNum = row.baseRate !== "" && !Number.isNaN(Number(row.baseRate));
          if (!baseIsNum) return row;
          const expected = computeExpectedRate(Number(row.baseRate), nextTier);
          return { ...row, rate: expected };
        })
      );
    },
    [computeExpectedRate]
  );

  // Totals calculation
  const { subtotal, discountAmount, total } = (() => {
    const numericRows = items.map((r) => ({
      qty: typeof r.qty === "number" ? r.qty : 0,
      rate: typeof r.rate === "number" ? r.rate : Number(r.rate || 0),
    }));
    const subtotal = numericRows.reduce((acc, r) => acc + r.qty * r.rate, 0);
    const discountPct = discountPercent === "" ? 0 : Number(discountPercent) / 100;
    const discountAmount = subtotal * discountPct;
    const total = subtotal - discountAmount;
    return {
      subtotal: toFixedNumber(subtotal),
      discountAmount: toFixedNumber(discountAmount),
      total: toFixedNumber(total),
    };
  })();

  // PDF generation
  const handleGeneratePdf = async () => {
    const invoiceNo = `INV-${String(Date.now()).slice(-6)}`;
    const cleanItems: InvoiceItem[] = items
      .filter((item) => item.sku.trim() !== "" && item.qty !== "" && item.rate !== "")
      .map((item) => ({
        productId: 0, // You can extend to include productId if needed
        description: item.description || "—",
        qty: Number(item.qty),
        rate: Number(item.rate),
        amount: Number(item.qty) * Number(item.rate),
      }));

    const payload = {
      companyName: companyName || "Your Company",
      companyAddr1,
      companyAddr2,
      phone,
      fax,
      email,
      website,
      date,
      estimateNo,
      invoiceNo,
      billTo,
      shipTo,
      items: cleanItems,
      discountPercent: discountPercent === "" ? 0 : Number(discountPercent),
      markupTier,
      subtotal,
      discount: discountAmount,
      total,
    };

    try {
      const pdfBlob = await generateEstimatePdf(payload, true);
      if (!(pdfBlob instanceof Blob)) throw new Error("PDF generation failed");

      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Pdf = (reader.result as string).split(",")[1];
        const res = await fetch("http://localhost:4000/api/estimates/save", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...payload, pdfData: base64Pdf }),
        });
        if (res.ok) alert(`Estimate saved! Invoice #: ${invoiceNo}`);
        else alert("PDF generated but failed to save.");
      };
      reader.readAsDataURL(pdfBlob);
    } catch (err) {
      console.error(err);
      alert("Failed to generate or save estimate.");
    }
  };

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 p-6 bg-gray-50">
        <h1 className="text-3xl font-bold mb-6 text-gray-800">Create Estimate</h1>

        {/* Company Header */}
        <section className="bg-white p-6 rounded-xl shadow mb-6 grid grid-cols-2 gap-4">
          <input value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Company name" className="w-full border px-3 py-2 rounded-lg" />
          <input value={companyAddr1} onChange={(e) => setCompanyAddr1(e.target.value)} placeholder="Address line 1" className="w-full border px-3 py-2 rounded-lg" />
          <input value={companyAddr2} onChange={(e) => setCompanyAddr2(e.target.value)} placeholder="Address line 2" className="w-full border px-3 py-2 rounded-lg" />
          <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone" className="w-full border px-3 py-2 rounded-lg" />
          <input value={fax} onChange={(e) => setFax(e.target.value)} placeholder="Fax" className="w-full border px-3 py-2 rounded-lg" />
          <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className="w-full border px-3 py-2 rounded-lg" />
          <input value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="Website" className="w-full border px-3 py-2 rounded-lg" />
          <input value={date} onChange={(e) => setDate(e.target.value)} type="date" className="w-full border px-3 py-2 rounded-lg" />
          <input value={estimateNo} onChange={(e) => setEstimateNo(e.target.value)} placeholder="Estimate #" className="w-full border px-3 py-2 rounded-lg" />
        </section>

        {/* Bill To / Ship To */}
        <section className="bg-white p-6 rounded-xl shadow mb-6 grid grid-cols-2 gap-6">
          <textarea value={billTo} onChange={(e) => setBillTo(e.target.value)} placeholder="Bill To" className="w-full border px-3 py-2 rounded-lg" rows={5} />
          <textarea value={shipTo} onChange={(e) => setShipTo(e.target.value)} placeholder="Ship To" className="w-full border px-3 py-2 rounded-lg" rows={5} />
        </section>

        {/* Markup Tier */}
        <section className="bg-gradient-to-r from-green-50 to-blue-50 p-8 rounded-xl shadow-lg mb-6 border-2 border-green-300">
          <div className="flex items-center gap-6">
            <select value={markupTier} onChange={(e) => handleMarkupChange(e.target.value as MarkupKey)} className="px-8 py-4 text-2xl font-bold bg-white border-4 border-green-600 rounded-xl shadow-lg focus:outline-none focus:ring-4 focus:ring-green-300 cursor-pointer transition">
              <option value="AA">AA — 0%</option>
              <option value="A">A — 50%</option>
              <option value="B">B — 60%</option>
              <option value="C">C — 70%</option>
              <option value="D">D — 80%</option>
            </select>
            <span className="text-xl font-medium text-green-700">Markup Tier</span>
            <div className="ml-auto text-sm text-gray-600">
              Tip: Type SKU or product name to auto-fill rate & description.
            </div>
          </div>
        </section>

        {/* Items Table */}
        <section className="bg-white p-6 rounded-xl shadow-lg mb-6 overflow-x-auto">
          <h3 className="text-xl font-bold mb-4 text-gray-800">Items</h3>
          <table className="w-full text-sm table-fixed border-collapse">
            <thead className="bg-gray-100">
              <tr>
                <th className="border px-3 py-3 w-24 text-left">Item / SKU</th>
                <th className="border px-3 py-3 w-16 text-left">Qty</th>
                <th className="border px-3 py-3 text-left">Description</th>
                <th className="border px-3 py-3 w-32 text-right">Rate (Selling)</th>
                <th className="border px-3 py-3 w-32 text-right font-bold">Line Total</th>
              </tr>
            </thead>
            <tbody>
              {items.map((row, i) => {
                const qty = typeof row.qty === "number" ? row.qty : 0;
                const rate = typeof row.rate === "number" ? row.rate : Number(row.rate || 0);
                const lineTotal = qty * rate;
                return (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="border px-3 py-2 align-top">
                      <input
                        className="w-full bg-gray-50 rounded px-2 py-1"
                        value={row.sku}
                        onChange={(e) => updateRow(i, "sku", e.target.value)}
                        placeholder="Enter SKU or Name"
                      />
                    </td>
                    <td className="border px-3 py-2 align-top">
                      <input
                        className="w-full text-center rounded px-2 py-1"
                        value={row.qty !== "" && row.qty != null ? row.qty : ""}
                        onChange={(e) => updateRow(i, "qty", e.target.value === "" ? "" : Number(e.target.value))}
                        type="number"
                        min={0}
                      />
                    </td>
                    <td className="border px-3 py-2 align-top">
                      <input
                        className="w-full bg-gray-50 rounded px-2 py-1"
                        value={row.description !== "" && row.description != null ? row.description : ""}
                        onChange={(e) => updateRow(i, "description", e.target.value)}
                      />
                    </td>
                    <td className="border px-3 py-2 align-top">
                      <input
                        className="w-full text-right font-medium text-blue-700 bg-blue-50 rounded px-2 py-1 focus:ring-2 focus:ring-blue-400"
                        value={row.rate !== "" && row.rate != null ? row.rate : ""}
                        onChange={(e) => updateRow(i, "rate", e.target.value === "" ? "" : Number(e.target.value))}
                        type="number"
                        step="0.01"
                      />
                    </td>
                    <td className="border px-3 py-2 text-right font-bold text-green-700 bg-green-50 align-top">
                      ${lineTotal.toFixed(2)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>

        {/* Totals */}
        <section className="bg-gradient-to-r from-green-50 to-blue-50 p-8 rounded-xl shadow-lg max-w-md border-2 border-green-200">
          <div className="space-y-4 text-lg">
            <div className="flex justify-between font-bold text-2xl">
              <span>Subtotal</span>
              <span className="text-blue-700">${subtotal.toFixed(2)}</span>
            </div>
            {discountPercent !== "" && discountAmount > 0 && (
              <div className="flex justify-between text-red-600">
                <span>Discount ({discountPercent}%)</span>
                <span>-${discountAmount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-3xl pt-4 border-t-4 border-green-400">
              <span>Final Total</span>
              <span className="text-green-700">${total.toFixed(2)}</span>
            </div>
          </div>

          <div className="mt-6 flex items-center gap-4">
            <label className="font-bold text-lg">Extra Discount %</label>
            <input
              type="number"
              step="0.01"
              value={discountPercent !== "" && discountPercent != null ? discountPercent : ""}
              onChange={(e) => setDiscountPercent(e.target.value === "" ? "" : Number(e.target.value))}
              className="w-32 px-4 py-3 border-2 border-green-500 rounded-lg text-lg font-bold focus:outline-none focus:ring-4 focus:ring-green-300"
              placeholder="0"
            />
          </div>
        </section>

        <div className="mt-8">
          <button
            onClick={handleGeneratePdf}
            className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-10 py-5 rounded-xl font-bold text-2xl hover:from-indigo-700 hover:to-purple-700 transition transform hover:scale-105 shadow-2xl"
          >
            Generate & Save Estimate
          </button>
        </div>
      </main>
    </div>
  );
}
