"use client";

import { useState } from "react";
import Sidebar from "@/components/sidebar";
import { generateEstimatePdf } from "@/lib/generateEstimatePdf";

type ItemRow = {
  sku: string;
  qty: number | "";
  description: string;
  rate: number | "";
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

  // fixed 10 rows
  const [items, setItems] = useState<ItemRow[]>(
    Array.from({ length: 10 }).map(() => ({
      sku: "",
      qty: "",
      description: "",
      rate: "",
    }))
  );

  const [discountPercent, setDiscountPercent] = useState<number | "">("");

  function updateRow(index: number, key: keyof ItemRow, value: any) {
    const next = items.slice();
    next[index] = { ...next[index], [key]: value };
    setItems(next);
  }

  function calculateTotals() {
    let subtotal = 0;
    for (const r of items) {
      const q = Number(r.qty) || 0;
      const rate = Number(r.rate) || 0;
      subtotal += q * rate;
    }
    const discount = discountPercent === "" ? 0 : (subtotal * Number(discountPercent)) / 100;
    const total = subtotal - discount;
    return { subtotal, discount, total };
  }

  const { subtotal, discount, total } = calculateTotals();

  async function handleGeneratePdf() {
    // Generate unique invoice number
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
      invoiceNo, // ✅ required property
      billTo,
      shipTo,
      items,
      discountPercent: discountPercent === "" ? 0 : Number(discountPercent),
      subtotal,
      discount,
      total,
    };

    try {
      // 1️⃣ Generate PDF bytes (Blob)
      const pdfBlob = (await generateEstimatePdf(payload, true)) as Blob;

      // 2️⃣ Convert to base64
      const reader = new FileReader();
      reader.readAsDataURL(pdfBlob);
      reader.onloadend = async () => {
        const base64Pdf = (reader.result as string).split(",")[1];

        // 3️⃣ POST full estimate with items to backend
        const res = await fetch("http://localhost:4000/api/estimates/save", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...payload, pdfData: base64Pdf }),
        });

        if (res.ok) {
          alert(`Estimate saved and PDF generated! Invoice #${invoiceNo}`);
        } else {
          console.error(await res.text());
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
        <h1 className="text-2xl font-semibold mb-4">Create Estimate</h1>

        {/* HEADER */}
        <section className="bg-white p-4 rounded shadow mb-6">
          <h2 className="font-medium mb-2">Header</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm">Company (optional)</label>
              <input value={companyName} onChange={(e) => setCompanyName(e.target.value)} className="w-full border px-2 py-1 rounded" placeholder="Company name" />
              <input value={companyAddr1} onChange={(e) => setCompanyAddr1(e.target.value)} className="w-full border px-2 py-1 rounded mt-2" placeholder="Address line 1" />
              <input value={companyAddr2} onChange={(e) => setCompanyAddr2(e.target.value)} className="w-full border px-2 py-1 rounded mt-2" placeholder="Address line 2" />
              <div className="flex gap-2 mt-2">
                <input value={phone} onChange={(e) => setPhone(e.target.value)} className="w-1/2 border px-2 py-1 rounded" placeholder="Phone" />
                <input value={fax} onChange={(e) => setFax(e.target.value)} className="w-1/2 border px-2 py-1 rounded" placeholder="Fax" />
              </div>
            </div>

            <div>
              <label className="block text-sm">Contact Info</label>
              <input value={email} onChange={(e) => setEmail(e.target.value)} className="w-full border px-2 py-1 rounded" placeholder="Email" />
              <input value={website} onChange={(e) => setWebsite(e.target.value)} className="w-full border px-2 py-1 rounded mt-2" placeholder="Website" />
              <div className="flex gap-2 mt-2">
                <input value={date} onChange={(e) => setDate(e.target.value)} className="w-1/2 border px-2 py-1 rounded" type="date" />
                <input value={estimateNo} onChange={(e) => setEstimateNo(e.target.value)} className="w-1/2 border px-2 py-1 rounded" placeholder="Estimate #" />
              </div>
            </div>
          </div>
        </section>

        {/* BILL TO / SHIP TO */}
        <section className="bg-white p-4 rounded shadow mb-6 grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm">Bill To</label>
            <textarea value={billTo} onChange={(e) => setBillTo(e.target.value)} className="w-full border px-2 py-1 rounded" rows={5} />
          </div>
          <div>
            <label className="block text-sm">Ship To</label>
            <textarea value={shipTo} onChange={(e) => setShipTo(e.target.value)} className="w-full border px-2 py-1 rounded" rows={5} />
          </div>
        </section>

        {/* ITEMS TABLE */}
        <section className="bg-white p-4 rounded shadow mb-6">
          <h3 className="font-medium mb-2">Items (10 rows)</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm table-fixed border-collapse">
              <thead>
                <tr>
                  <th className="border px-2 w-24">Item</th>
                  <th className="border px-2 w-16">Qty</th>
                  <th className="border px-2">Description</th>
                  <th className="border px-2 w-28">Rate</th>
                  <th className="border px-2 w-28">Total</th>
                </tr>
              </thead>
              <tbody>
                {items.map((r, i) => {
                  const rowTotal = (Number(r.qty) || 0) * (Number(r.rate) || 0);
                  return (
                    <tr key={i}>
                      <td className="border px-2">
                        <input className="w-full" value={r.sku} onChange={(e) => updateRow(i, "sku", e.target.value)} />
                      </td>
                      <td className="border px-2">
                        <input className="w-full" value={r.qty} onChange={(e) => updateRow(i, "qty", e.target.value === "" ? "" : Number(e.target.value))} />
                      </td>
                      <td className="border px-2">
                        <input className="w-full" value={r.description} onChange={(e) => updateRow(i, "description", e.target.value)} />
                      </td>
                      <td className="border px-2">
                        <input className="w-full" value={r.rate} onChange={(e) => updateRow(i, "rate", e.target.value === "" ? "" : Number(e.target.value))} />
                      </td>
                      <td className="border px-2 text-right">{rowTotal.toFixed(2)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* TOTALS */}
        <section className="bg-white p-4 rounded shadow mb-6 max-w-md">
          <div className="flex gap-2 items-center mb-2">
            <label className="w-32">Discount %</label>
            <input
              className="border px-2 py-1 rounded flex-1"
              value={discountPercent}
              onChange={(e) => setDiscountPercent(e.target.value === "" ? "" : Number(e.target.value))}
            />
          </div>

          <div className="space-y-1">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Discount</span>
              <span>-${discount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-semibold text-lg pt-1 border-t">
              <span>Total</span>
              <span>${total.toFixed(2)}</span>
            </div>
          </div>
        </section>

        {/* GENERATE BUTTON */}
        <div className="flex gap-2">
          <button
            onClick={handleGeneratePdf}
            className="bg-indigo-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-indigo-700 transition"
          >
            Generate & Save Estimate
          </button>
        </div>
      </main>
    </div>
  );
}
