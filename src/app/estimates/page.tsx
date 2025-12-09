"use client";

import { useState, useEffect } from "react";
import Sidebar from "@/components/sidebar";
import { generateEstimatePdf } from "@/lib/generateEstimatePdf";

type ItemRow = {
  sku: string;
  qty: number | "";
  description: string;
  baseRate: number | ""; // original cost from product
  rate: number | "";     // final selling price (can be edited!)
};

type Product = {
  id: number;
  name: string;
  description: string;
  inputcost: number;
  vendors: string[];
};

export default function InvoicesPage() {
  const [companyName, setCompanyName] = useState("");
  const [companyAddr1, setCompanyAddr1] = useState("");
  const [companyAddr2, setCompanyAddr2] = useState("");
  const [phone, setPhone] = useState("");
  const [fax, setFax] = useState("");
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [estimateNo, setEstimateNo] = useState("");
  const [billTo, setBillTo] = useState("");
  const [shipTo, setShipTo] = useState("");

  const [items, setItems] = useState<ItemRow[]>(
    Array.from({ length: 10 }).map(() => ({
      sku: "",
      qty: "",
      description: "",
      baseRate: "",
      rate: "",
    }))
  );

  const [discountPercent, setDiscountPercent] = useState<number | "">("");
  const [markupTier, setMarkupTier] = useState<"AA" | "A" | "B" | "C" | "D">("AA"); // AA = 0% markup
  const [products, setProducts] = useState<Product[]>([]);

  // AA = 0%, A=50%, B=60%, C=70%, D=80%
  const markupRates: Record<"AA" | "A" | "B" | "C" | "D", number> = {
    AA: 0.00,
    A: 0.50,
    B: 0.60,
    C: 0.70,
    D: 0.80,
  };

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const res = await fetch("http://localhost:4000/api/products");
        const data: Product[] = await res.json();
        setProducts(data);
      } catch (err) {
        console.error("Failed to fetch products:", err);
      }
    };
    fetchProducts();
  }, []);

  // Recalculate rates when tier changes (only if not manually edited)
  useEffect(() => {
    setItems((prev) =>
      prev.map((row) => {
        if (!row.baseRate || row.baseRate === "") return row;

        const expectedRate = Number(row.baseRate) * (1 + markupRates[markupTier]);
        const currentRate = Number(row.rate || 0);

        // Only auto-update if rate matches expected or is empty
        if (Math.abs(currentRate - expectedRate) < 0.01 || currentRate === 0) {
          return { ...row, rate: Number(expectedRate.toFixed(2)) };
        }
        return row; // keep manual override
      })
    );
  }, [markupTier]);

  function updateRow(index: number, key: keyof ItemRow, value: any) {
    setItems((prev) => {
      const next = [...prev];
      const row = { ...next[index] };

      if (key === "sku") {
        const product = products.find((p) => p.name === value || p.id.toString() === value);
        if (product) {
          row.description = product.description;
          row.baseRate = product.inputcost;
          const newRate = product.inputcost * (1 + markupRates[markupTier]);
          row.rate = Number(newRate.toFixed(2));
        } else {
          row.description = "";
          row.baseRate = "";
          row.rate = "";
        }
      } else if (key === "qty") {
        row.qty = value === "" ? "" : Number(value);
      } else if (key === "description") {
        row.description = value;
      } else if (key === "rate") {
        row.rate = value === "" ? "" : Number(Number(value).toFixed(2));
      }

      next[index] = row;
      return next;
    });
  }

  function calculateTotals() {
    let subtotal = 0;
    for (const r of items) {
      const q = Number(r.qty) || 0;
      const rate = Number(r.rate) || 0;
      subtotal += q * rate;
    }
    const discountAmount = discountPercent === "" ? 0 : (subtotal * Number(discountPercent)) / 100;
    const total = subtotal - discountAmount;
    return { subtotal, discountAmount, total };
  }

  const { subtotal, discountAmount, total } = calculateTotals();

  async function handleGeneratePdf() {
    const invoiceNo = `INV-${String(Date.now()).slice(-6)}`;

    const payload = {
      companyName,
      companyAddr1,
      companyAddr2,
      phone,
      fax,
      email,
      website,
      date,
      estimateNo: estimateNo || "",
      invoiceNo,
      billTo,
      shipTo,
      items: items.map((i) => ({
        sku: i.sku,
        qty: i.qty,
        description: i.description,
        rate: i.rate,
      })),
      discountPercent: discountPercent === "" ? 0 : Number(discountPercent),
      markupTier,
      subtotal,
      discount: discountAmount,
      total,
    };

    try {
      const pdfBlob = (await generateEstimatePdf(payload, true)) as Blob;
      const reader = new FileReader();
      reader.readAsDataURL(pdfBlob);
      reader.onloadend = async () => {
        const base64Pdf = (reader.result as string).split(",")[1];

        const res = await fetch("http://localhost:4000/api/estimates/save", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...payload, pdfData: base64Pdf }),
        });

        if (res.ok) {
          alert(`Estimate saved! Invoice #${invoiceNo}\nTier: ${markupTier} (${(markupRates[markupTier] * 100).toFixed(0)}% markup)`);
        } else {
          alert("PDF generated, but failed to save estimate.");
        }
      };
    } catch (err) {
      console.error(err);
      alert("Failed to generate PDF or save estimate.");
    }
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />

      <main className="flex-1 p-6 bg-gray-50">
        <h1 className="text-3xl font-bold mb-6 text-gray-800">Create Estimate</h1>

        {/* HEADER */}
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

        {/* BILL TO / SHIP TO */}
        <section className="bg-white p-6 rounded-xl shadow mb-6 grid grid-cols-2 gap-6">
          <textarea value={billTo} onChange={(e) => setBillTo(e.target.value)} placeholder="Bill To" className="w-full border px-3 py-2 rounded-lg" rows={5} />
          <textarea value={shipTo} onChange={(e) => setShipTo(e.target.value)} placeholder="Ship To" className="w-full border px-3 py-2 rounded-lg" rows={5} />
        </section>

        {/* MARKUP TIER - NOW INCLUDES AA */}
        <section className="bg-gradient-to-r from-green-50 to-blue-50 p-8 rounded-xl shadow-lg mb-6 border-2 border-green-300">
          <div className="flex items-center gap-6">

            <select
              value={markupTier}
              onChange={(e) => setMarkupTier(e.target.value as "AA" | "A" | "B" | "C" | "D")}
              className="px-8 py-4 text-2xl font-bold bg-white border-4 border-green-600 rounded-xl shadow-lg focus:outline-none focus:ring-4 focus:ring-green-300 cursor-pointer transition"
            >
              <option value="AA">AA — 0%</option>
              <option value="A">A — 50</option>
              <option value="B">B — 60</option>
              <option value="C">C — 70</option>
              <option value="D">D — 80 </option>
            </select>
            <span className="text-xl font-medium text-green-700">
              
            </span>
          </div>
        </section>

        {/* ITEMS TABLE */}
        <section className="bg-white p-6 rounded-xl shadow-lg mb-6">
          <h3 className="text-xl font-bold mb-4 text-gray-800">Items</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm table-fixed border-collapse">
              <thead className="bg-gray-100">
                <tr>
                  <th className="border px-3 py-3 w-24 text-left">Item</th>
                  <th className="border px-3 py-3 w-16 text-left">Qty</th>
                  <th className="border px-3 py-3 text-left">Description</th>
                  <th className="border px-3 py-3 w-32 text-right">Rate (Selling)</th>
                  <th className="border px-3 py-3 w-32 text-right font-bold">Line Total</th>
                </tr>
              </thead>
              <tbody>
                {items.map((r, i) => {
                  const lineTotal = (Number(r.qty) || 0) * (Number(r.rate) || 0);
                  return (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="border px-3 py-2">
                        <input
                          className="w-full bg-gray-50 rounded px-2 py-1"
                          value={r.sku}
                          onChange={(e) => updateRow(i, "sku", e.target.value)}
                          placeholder="SKU"
                        />
                      </td>
                      <td className="border px-3 py-2">
                        <input
                          className="w-full text-center rounded px-2 py-1"
                          value={r.qty}
                          onChange={(e) => updateRow(i, "qty", e.target.value === "" ? "" : Number(e.target.value))}
                          type="number"
                          min="0"
                        />
                      </td>
                      <td className="border px-3 py-2">
                        <input
                          className="w-full bg-gray-50 rounded px-2 py-1"
                          value={r.description}
                          onChange={(e) => updateRow(i, "description", e.target.value)}
                        />
                      </td>
                      <td className="border px-3 py-2">
                        <input
                          className="w-full text-right font-medium text-blue-700 bg-blue-50 rounded px-2 py-1 focus:ring-2 focus:ring-blue-400"
                          value={r.rate}
                          onChange={(e) => updateRow(i, "rate", e.target.value === "" ? "" : e.target.value)}
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                        />
                      </td>
                      <td className="border px-3 py-2 text-right font-bold text-green-700 bg-green-50">
                        ${lineTotal.toFixed(2)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* TOTALS */}
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
              value={discountPercent}
              onChange={(e) => setDiscountPercent(e.target.value === "" ? "" : Number(e.target.value))}
              className="w-32 px-4 py-3 border-2 border-green-500 rounded-lg text-lg font-bold focus:outline-none focus:ring-4 focus:ring-green-300"
              placeholder="0"
            />
          </div>
        </section>

        {/* GENERATE BUTTON */}
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