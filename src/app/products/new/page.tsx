"use client";

import { useState } from "react";
import { api } from "@/lib/api";

export default function NewProduct() {
  const [sku, setSku] = useState("");
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [desc, setDesc] = useState("");

  async function submit() {
    await api("/products", {
      method: "POST",
      body: JSON.stringify({
        sku,
        name,
        price: Number(price),
        description: desc || null,
      }),
    });

    window.location.href = "/products";
  }

  return (
    <div className="p-10 max-w-xl mx-auto">
      <h1 className="text-2xl font-semibold mb-6">New Product</h1>

      <div className="flex flex-col gap-3">
        <input className="border p-2" placeholder="SKU" value={sku} onChange={(e) => setSku(e.target.value)} />
        <input className="border p-2" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
        <input className="border p-2" placeholder="Price" value={price} onChange={(e) => setPrice(e.target.value)} />
        <textarea className="border p-2" placeholder="Description" value={desc} onChange={(e) => setDesc(e.target.value)} />

        <button onClick={submit} className="bg-black text-white py-2 rounded">
          Save
        </button>
      </div>
    </div>
  );
}
