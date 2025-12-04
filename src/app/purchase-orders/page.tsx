// app/purchase-orders/page.tsx
"use client";

import { useState, useEffect } from "react";
import Sidebar from "@/components/sidebar";
import { Package, CheckCircle2, FileText, X } from "lucide-react";
import { generateBillingPdf } from "@/lib/generateBillingPdf";

interface Product {
  id: string;
  name: string;
  style: string;
  sku?: string;
  inputcost: number;
  stock: number;
  needToOrder: number;
  vendors: string[];
}

export type BillingItem = {
  item: string;
  qty: number | "";
  description: string;
  rate: number | "";
  sku?: string;
  style?: string;
};

export type BillingPayload = {
  companyName?: string;
  companyAddr1?: string;
  phone?: string;
  email?: string;
  website?: string;
  date?: string;
  billTo?: string;
  shipTo?: string;
  items: BillingItem[];
  subtotal: number;     // Required by generateBillingPdf
  total: number;
  invoiceNo: string;    // You type this manually
  salesman?: string;
  tax?: number;
};

export default function PurchaseOrdersPage() {
  const [productsToOrder, setProductsToOrder] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [billingData, setBillingData] = useState<BillingPayload>({
    companyName: "Your Company Name",
    companyAddr1: "123 Business St, City, State 12345",
    phone: "+1 (555) 123-4567",
    email: "sales@yourcompany.com",
    website: "www.yourcompany.com",
    date: new Date().toISOString().split("T")[0],
    invoiceNo: "",
    salesman: "",
    billTo: "",
    shipTo: "",
    items: [],
    subtotal: 0,
    total: 0,
    tax: 0,
  });

  useEffect(() => {
    const fetchNeededProducts = async () => {
      try {
        const res = await fetch("http://localhost:4000/api/products/needToOrder");
        const data = await res.json();

        const filtered = data
          .filter((p: any) => p.needToOrder > 0)
          .map((p: any) => ({
            id: String(p.id),
            name: p.name,
            style: p.style || "",
            sku: p.sku || "",
            inputcost: Number(p.inputcost),
            stock: p.stock ?? 0,
            needToOrder: p.needToOrder ?? 0,
            vendors: p.vendors ?? [],
          }));

        setProductsToOrder(filtered);
        setLoading(false);
      } catch (err) {
        console.error(err);
        setLoading(false);
      }
    };

    fetchNeededProducts();
  }, []);

  const openBillingModal = (product: Product) => {
    const fullName = `${product.name} ${product.style || ""}`.trim();
    const qty = product.needToOrder;
    const rate = product.inputcost;
    const subtotal = qty * rate;

    setSelectedProduct(product);
    setBillingData({
      companyName: "Your Company Name",
      companyAddr1: "123 Business St, City, State 12345",
      phone: "+1 (555) 123-4567",
      email: "sales@yourcompany.com",
      website: "www.yourcompany.com",
      date: new Date().toISOString().split("T")[0],
      invoiceNo: "", // You type this
      salesman: "",
      billTo: "",
      shipTo: "",
      items: [{
        item: fullName,
        qty,
        description: product.sku || "",
        rate,
        sku: product.sku || "",
        style: product.style || "",
      }],
      subtotal,
      total: subtotal,
      tax: 0,
    });
    setIsModalOpen(true);
  };

  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  const handleSubmitBilling = async () => {
    if (!selectedProduct) return;
    if (!billingData.invoiceNo.trim()) {
      alert("Please enter an Invoice Number!");
      return;
    }

    // Recalculate in case user changed items
    const itemsTotal = billingData.items.reduce(
      (sum, item) => sum + Number(item.qty || 0) * Number(item.rate || 0),
      0
    );

    const finalData: BillingPayload = {
      ...billingData,
      subtotal: itemsTotal,
      total: itemsTotal + (billingData.tax || 0),
      invoiceNo: billingData.invoiceNo.trim(),
    };

    try {
      // 1. Generate PDF
      const pdfBlob = await generateBillingPdf(finalData, true);
      const pdfBase64 = await blobToBase64(pdfBlob);

      // 2. Save PDF
      const saveRes = await fetch("http://localhost:4000/api/billing/save-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: Number(selectedProduct.id),
          invoiceNo: finalData.invoiceNo,
          cost: finalData.total,
          pdfBase64,
        }),
      });

      if (!saveRes.ok) {
        const err = await saveRes.json();
        throw new Error(err.error || "Failed to save PDF");
      }

      // 3. Update stock by style + SKU
      const stockUpdates = finalData.items
        .filter(item => item.style?.trim() && item.sku?.trim() && item.qty)
        .map(item => ({
          style: item.style!.trim(),
          sku: item.sku!.trim(),
          qty: Number(item.qty),
        }));

      if (stockUpdates.length > 0) {
        const stockRes = await fetch("http://localhost:4000/api/products/increment-stock-by-style-sku", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ items: stockUpdates }),
        });

        if (!stockRes.ok) {
          const err = await stockRes.json();
          alert(`Warning: Stock update failed — ${err.error || "Check style/SKU"}`);
        }
      }

      // 4. Reset needToOrder
      await fetch(`http://localhost:4000/api/products/needToOrder/${selectedProduct.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ needToOrder: 0 }),
      });

      // 5. Remove from list
      setProductsToOrder(prev => prev.filter(p => p.id !== selectedProduct.id));

      alert(`Success!\nInvoice #${finalData.invoiceNo} saved\nStock updated correctly.`);

      setIsModalOpen(false);
      setSelectedProduct(null);
    } catch (error: any) {
      console.error("Billing failed:", error);
      alert("Error: " + (error.message || "Something went wrong"));
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="flex-1 p-8 flex items-center justify-center">
          <div className="text-xl text-gray-600">Loading purchase needs...</div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 p-8">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-gray-900 flex items-center gap-3">
              <Package className="w-10 h-10 text-blue-600" />
              Purchase Orders Needed
            </h1>
          </div>

          {productsToOrder.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-2xl border-2 border-dashed border-gray-300">
              <CheckCircle2 className="w-20 h-20 text-green-500 mx-auto mb-4" />
              <p className="text-2xl font-semibold text-gray-700">You're Fully Stocked!</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">Style / SKU</th>
                      <th className="px-6 py-4 text-center text-xs font-medium text-gray-500 uppercase">Stock</th>
                      <th className="px-6 py-4 text-center text-xs font-medium text-gray-500 uppercase">Need</th>
                      <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase">Cost</th>
                      <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">Vendor</th>
                      <th className="px-6 py-4 text-center text-xs font-medium text-gray-500 uppercase">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {productsToOrder.map((product) => (
                      <tr key={product.id} className="hover:bg-gray-50">
                        <td className="px-6 py-5 font-medium">{product.name}</td>
                        <td className="px-6 py-5 text-sm text-gray-600">
                          {product.style} {product.sku && `• ${product.sku}`}
                        </td>
                        <td className="px-6 py-5 text-center">
                          <span className={`px-3 py-1 rounded-full text-sm ${product.stock < 10 ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800"}`}>
                            {product.stock}
                          </span>
                        </td>
                        <td className="px-6 py-5 text-center">
                          <span className="px-4 py-2 bg-red-500 text-white rounded-full font-bold text-lg">
                            {product.needToOrder}
                          </span>
                        </td>
                        <td className="px-6 py-5 text-right">${product.inputcost.toFixed(2)}</td>
                        <td className="px-6 py-5 text-right font-bold text-green-600">
                          ${(product.inputcost * product.needToOrder).toFixed(2)}
                        </td>
                        <td className="px-6 py-5 text-sm text-gray-600">{product.vendors.join(", ")}</td>
                        <td className="px-6 py-5 text-center">
                          <button
                            onClick={() => openBillingModal(product)}
                            className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition shadow-sm"
                          >
                            <FileText className="w-4 h-4" />
                            Create Billing Order
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Billing Modal */}
        {isModalOpen && selectedProduct && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[92vh] overflow-y-auto">
              <div className="flex justify-between items-center p-6 border-b sticky top-0 bg-white z-10">
                <h2 className="text-2xl font-bold">Create Billing Order</h2>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="p-6 space-y-8">
                <div className="grid grid-cols-2 gap-6">
                  <input
                    placeholder="Company Name"
                    className="px-4 py-3 border rounded-lg"
                    value={billingData.companyName}
                    onChange={(e) => setBillingData((p) => ({ ...p, companyName: e.target.value }))}
                  />
                  <input
                    placeholder="Invoice No (required)"
                    className="px-4 py-3 border-2 border-red-500 rounded-lg font-bold text-red-700 placeholder-red-400"
                    value={billingData.invoiceNo}
                    onChange={(e) => setBillingData((p) => ({ ...p, invoiceNo: e.target.value }))}
                  />
                  <input
                    placeholder="Company Address"
                    className="px-4 py-3 border rounded-lg"
                    value={billingData.companyAddr1}
                    onChange={(e) => setBillingData((p) => ({ ...p, companyAddr1: e.target.value }))}
                  />
                  <input
                    type="date"
                    className="px-4 py-3 border rounded-lg"
                    value={billingData.date}
                    onChange={(e) => setBillingData((p) => ({ ...p, date: e.target.value }))}
                  />
                  <input
                    placeholder="Phone"
                    className="px-4 py-3 border rounded-lg"
                    value={billingData.phone}
                    onChange={(e) => setBillingData((p) => ({ ...p, phone: e.target.value }))}
                  />
                  <input
                    placeholder="Salesman"
                    className="px-4 py-3 border rounded-lg"
                    value={billingData.salesman}
                    onChange={(e) => setBillingData((p) => ({ ...p, salesman: e.target.value }))}
                  />
                </div>

                <div className="grid grid-cols-2 gap-8">
                  <div className="bg-blue-50 p-5 rounded-xl border border-blue-200">
                    <h3 className="font-bold text-lg mb-3 text-blue-900">Bill To</h3>
                    <input
                      placeholder="Customer Name"
                      className="w-full px-4 py-2 border rounded-lg mb-2"
                      value={billingData.billTo?.split("\n")[0] || ""}
                      onChange={(e) => {
                        const lines = billingData.billTo?.split("\n") || [];
                        lines[0] = e.target.value;
                        setBillingData((p) => ({ ...p, billTo: lines.join("\n") }));
                      }}
                    />
                    <textarea
                      placeholder="Address"
                      rows={4}
                      className="w-full px-4 py-2 border rounded-lg resize-none"
                      value={billingData.billTo?.split("\n").slice(1).join("\n") || ""}
                      onChange={(e) => {
                        const name = billingData.billTo?.split("\n")[0] || "";
                        setBillingData((p) => ({ ...p, billTo: [name, e.target.value].filter(Boolean).join("\n") }));
                      }}
                    />
                  </div>
                  <div className="bg-green-50 p-5 rounded-xl border border-green-200">
                    <h3 className="font-bold text-lg mb-3 text-green-900">Ship To</h3>
                    <input
                      placeholder="Recipient Name"
                      className="w-full px-4 py-2 border rounded-lg mb-2"
                      value={billingData.shipTo?.split("\n")[0] || ""}
                      onChange={(e) => {
                        const lines = billingData.shipTo?.split("\n") || [];
                        lines[0] = e.target.value;
                        setBillingData((p) => ({ ...p, shipTo: lines.join("\n") }));
                      }}
                    />
                    <textarea
                      placeholder="Shipping Address"
                      rows={4}
                      className="w-full px-4 py-2 border rounded-lg resize-none"
                      value={billingData.shipTo?.split("\n").slice(1).join("\n") || ""}
                      onChange={(e) => {
                        const name = billingData.shipTo?.split("\n")[0] || "";
                        setBillingData((p) => ({ ...p, shipTo: [name, e.target.value].filter(Boolean).join("\n") }));
                      }}
                    />
                  </div>
                </div>

                <div className="bg-gray-50 p-6 rounded-xl">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-lg">Items</h3>
                    <button
                      onClick={() =>
                        setBillingData((p) => ({
                          ...p,
                          items: [...p.items, { item: "", qty: "", description: "", rate: "", sku: "", style: "" }],
                        }))
                      }
                      className="text-blue-600 hover:text-blue-800 font-medium"
                    >
                      + Add Item
                    </button>
                  </div>

                  <div className="space-y-3">
                    {billingData.items.map((item, i) => (
                      <div key={i} className="grid grid-cols-12 gap-3 items-center bg-white p-4 rounded-lg border">
                        <input
                          placeholder="Item"
                          value={item.item}
                          onChange={(e) => {
                            const newItems = [...billingData.items];
                            newItems[i].item = e.target.value;
                            setBillingData((p) => ({ ...p, items: newItems }));
                          }}
                          className="col-span-3 px-3 py-2 border rounded"
                        />
                        <input
                          type="number"
                          placeholder="Qty"
                          value={item.qty}
                          onChange={(e) => {
                            const newItems = [...billingData.items];
                            newItems[i].qty = e.target.value === "" ? "" : Number(e.target.value);
                            setBillingData((p) => ({ ...p, items: newItems }));
                          }}
                          className="col-span-1 px-3 py-2 border rounded text-center font-bold"
                        />
                        <input
                          placeholder="Style"
                          value={item.style || ""}
                          onChange={(e) => {
                            const newItems = [...billingData.items];
                            newItems[i].style = e.target.value;
                            setBillingData((p) => ({ ...p, items: newItems }));
                          }}
                          className="col-span-2 px-3 py-2 border-2 border-purple-300 rounded bg-purple-50 font-medium"
                        />
                        <input
                          placeholder="SKU"
                          value={item.sku || ""}
                          onChange={(e) => {
                            const newItems = [...billingData.items];
                            newItems[i].sku = e.target.value;
                            setBillingData((p) => ({ ...p, items: newItems }));
                          }}
                          className="col-span-2 px-3 py-2 border-2 border-orange-300 rounded bg-orange-50 font-mono"
                        />
                        <input
                          type="number"
                          step="0.01"
                          placeholder="Rate"
                          value={item.rate}
                          onChange={(e) => {
                            const newItems = [...billingData.items];
                            newItems[i].rate = e.target.value === "" ? "" : Number(e.target.value);
                            setBillingData((p) => ({ ...p, items: newItems }));
                          }}
                          className="col-span-2 px-3 py-2 border rounded text-right"
                        />
                        <div className="col-span-2 text-right font-bold text-green-600">
                          ${((Number(item.qty || 0) * Number(item.rate || 0)).toFixed(2))}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-8 text-right">
                    <p className="text-3xl font-bold text-green-600">
                      Total: ${billingData.items.reduce((s, i) => s + Number(i.qty || 0) * Number(i.rate || 0), 0).toFixed(2)}
                    </p>
                  </div>
                </div>

                <div className="flex justify-end gap-4 pt-4 border-t">
                  <button
                    onClick={() => setIsModalOpen(false)}
                    className="px-6 py-3 border rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSubmitBilling}
                    className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium shadow-lg"
                  >
                    Generate & Save PDF
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}