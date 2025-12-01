"use client";

import { useState, useEffect } from "react";
import Sidebar from "@/components/sidebar";
import { generateBillingPdf } from "@/lib/generateBillingPdf";
import { useSearchParams } from "next/navigation";
import { useRouter } from "next/navigation";

type ItemRow = {
  item: string;
  qty: number | "";
  description: string;
  rate: number | "";
};

export default function BillingForm() {
  const router = useRouter();
  const query = useSearchParams();
const orderId = Number(query.get("orderId"));
const productId = query.get("sku") || "";
const name = query.get("name") || "";
const description = query.get("description") || "";
const vendors = query.get("vendors") || "";
const count = Number(query.get("count") || 0);

  // -------------------- STATES --------------------
  const [companyName, setCompanyName] = useState("");
  const [companyAddr1, setCompanyAddr1] = useState("");
  const [companyAddr2, setCompanyAddr2] = useState("");
  const [phone, setPhone] = useState("");
  const [fax, setFax] = useState("");
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [billNo, setBillNo] = useState("");
  const [paymentTerms, setPaymentTerms] = useState("");
  const [supplierAddress, setSupplierAddress] = useState("");
  const [shipTo, setShipTo] = useState("");
  const [currentProductId, setCurrentProductId] = useState(productId);


  const [items, setItems] = useState<ItemRow[]>([]);

  // -------------------- SYNC WITH URL / NEW ORDER --------------------
useEffect(() => {
  // Prefill supplier address
  setSupplierAddress(vendors);

  // Prefill company name from order name
  setCompanyName(name); // use the top-level 'name' directly

  // Reset items for the new order, prefilled with data
  const defaultItems: ItemRow[] = [
  {
    item: productId,
    qty: count || "" as number | "",
    description: description || vendors,
    rate: "" as number | "",
  },
  ...Array.from({ length: 9 }).map(() => ({
    item: "",
    qty: "" as number | "",
    description: "",
    rate: "" as number | "",
  })),
];


  setItems(defaultItems);

  // Optional: reset other fields if needed
  setShipTo("");
  setBillNo("");
  setPaymentTerms("");
}, [orderId, vendors, productId, description, count, name]);



  // -------------------- ITEM TABLE HELPERS --------------------
  function updateRow(index: number, key: keyof ItemRow, value: any) {
  const next = [...items];
  next[index] = { ...next[index], [key]: value };
  setItems(next);

  // if first row's item changes, update currentProductId
  if (index === 0 && key === "item") {
    setCurrentProductId(value);
  }
}
  function calculateTotals() {
    let subtotal = 0;
    for (const r of items) {
      subtotal += (Number(r.qty) || 0) * (Number(r.rate) || 0);
    }
    const total = subtotal;
    return { subtotal, total };
  }

  const { subtotal, total } = calculateTotals();

  // -------------------- ORDER CANCEL ON NAVIGATION --------------------
  useEffect(() => {
    if (!orderId) return;

    let isSaved = false;

    (window as any).__markBillingSaved = () => {
      isSaved = true;
    };

    const handleUnload = async () => {
      if (!isSaved) {
        try {
          await fetch(`http://localhost:4000/api/orders/cancel/${orderId}`, {
            method: "DELETE",
          });
        } catch (err) {
          console.error("Failed to cancel order:", err);
        }
      }
    };

    window.addEventListener("beforeunload", handleUnload);

    return () => {
      handleUnload(); // SPA navigation
      window.removeEventListener("beforeunload", handleUnload);
    };
  }, [orderId]);

  // -------------------- PDF GENERATION --------------------
  async function handleGeneratePdf() {
  if (!orderId) {
    alert("Missing orderId. Cannot generate PDF.");
    return;
  }

  const invoiceNo = billNo || `BILL-${String(Date.now()).slice(-6)}`;

  // Grab SKU from the first row
  const sku = items[0]?.item || "";

  const payload = {
    type: "BILL",
    companyName,
    companyAddr1,
    companyAddr2,
    phone,
    fax,
    email,
    website,
    date,
    invoiceNo,
    paymentTerms,
    supplierAddress,
    shipTo,
    items,
    subtotal,
    total,
    productId: sku, // ✅ use first item's SKU
  };

  try {
    // 1️⃣ Generate PDF
    const pdfBlob = (await generateBillingPdf(payload, true)) as Blob;

    const reader = new FileReader();
    reader.readAsDataURL(pdfBlob);
    reader.onloadend = async () => {
      const base64Pdf = (reader.result as string).split(",")[1];

      // 2️⃣ Save billing info
      const saveRes = await fetch("http://localhost:4000/api/billing/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...payload,
          pdfData: base64Pdf,
          orderId: Number(orderId),
          items,
          productId: sku, // ✅ keep SKU consistent
          name: companyName,
          description: items.map((i) => i.description).join(", "),
          vendors: supplierAddress,
          count: items.reduce((sum, i) => sum + (Number(i.qty) || 0), 0),
        }),
      });

      if (!saveRes.ok) {
        alert("PDF generated, but saving failed.");
        return;
      }

      // 3️⃣ UPDATE the order with vendors & description
      await fetch(`http://localhost:4000/api/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vendors: supplierAddress,
          description: items.map((i) => i.description).join(", "),
        }),
      });

      alert(`Bill saved! #${invoiceNo}`);
      (window as any).__markBillingSaved();
      router.back();
    };
  } catch (err) {
    console.error(err);
    alert("Failed to generate bill.");
  }
}




  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 p-6 bg-gray-50">
        <h1 className="text-2xl font-semibold mb-4">Create Bill</h1>

        {/* HEADER */}
        <section className="bg-white p-4 rounded shadow mb-6">
          <h2 className="font-medium mb-2">Company Header</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm">Company</label>
              <input
                className="w-full border px-2 py-1 rounded"
                placeholder="Company name"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
              />
              <input
                className="w-full border px-2 py-1 rounded mt-2"
                placeholder="Address line 1"
                value={companyAddr1}
                onChange={(e) => setCompanyAddr1(e.target.value)}
              />
              <input
                className="w-full border px-2 py-1 rounded mt-2"
                placeholder="Address line 2"
                value={companyAddr2}
                onChange={(e) => setCompanyAddr2(e.target.value)}
              />
              <div className="flex gap-2 mt-2">
                <input
                  className="w-1/2 border px-2 py-1 rounded"
                  placeholder="Phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
                <input
                  className="w-1/2 border px-2 py-1 rounded"
                  placeholder="Fax"
                  value={fax}
                  onChange={(e) => setFax(e.target.value)}
                />
              </div>
            </div>
            <div>
              <label className="block text-sm">Contact Info</label>
              <input
                className="w-full border px-2 py-1 rounded"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <input
                className="w-full border px-2 py-1 rounded mt-2"
                placeholder="Website"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
              />
              <div className="flex gap-2 mt-2">
                <input
                  className="w-1/2 border px-2 py-1 rounded"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
                <input
                  className="w-1/2 border px-2 py-1 rounded"
                  placeholder="Bill #"
                  value={billNo}
                  onChange={(e) => setBillNo(e.target.value)}
                />
              </div>
              <input
                className="w-full border px-2 py-1 rounded mt-2"
                placeholder="Payment Terms (e.g. Net 30)"
                value={paymentTerms}
                onChange={(e) => setPaymentTerms(e.target.value)}
              />
            </div>
          </div>
        </section>

        {/* SUPPLIER & SHIP TO */}
        <section className="bg-white p-4 rounded shadow mb-6 grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium">Supplier Address</label>
            <textarea
              rows={5}
              className="w-full border px-2 py-1 rounded"
              value={supplierAddress}
              onChange={(e) => setSupplierAddress(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Ship To</label>
            <textarea
              rows={5}
              className="w-full border px-2 py-1 rounded"
              value={shipTo}
              onChange={(e) => setShipTo(e.target.value)}
            />
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
                        <input
                          className="w-full"
                          value={r.item}
                          onChange={(e) => updateRow(i, "item", e.target.value)}
                        />
                      </td>
                      <td className="border px-2">
                        <input
                          className="w-full"
                          value={r.qty}
                          onChange={(e) =>
                            updateRow(i, "qty", e.target.value === "" ? "" : Number(e.target.value))
                          }
                        />
                      </td>
                      <td className="border px-2">
                        <input
                          className="w-full"
                          value={r.description}
                          onChange={(e) => updateRow(i, "description", e.target.value)}
                        />
                      </td>
                      <td className="border px-2">
                        <input
                          className="w-full"
                          value={r.rate}
                          onChange={(e) =>
                            updateRow(i, "rate", e.target.value === "" ? "" : Number(e.target.value))
                          }
                        />
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
          <div className="space-y-1">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-semibold text-lg pt-1 border-t">
              <span>Total</span>
              <span>${total.toFixed(2)}</span>
            </div>
          </div>
        </section>

        {/* BUTTON */}
        <button
          onClick={handleGeneratePdf}
          className="bg-indigo-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-indigo-700"
        >
          Generate Bill (PDF)
        </button>
      </main>
    </div>
  );
}
