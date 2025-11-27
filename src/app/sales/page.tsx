"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { io } from "socket.io-client";

const socket = io("http://localhost:4000");

export default function SalesPage() {
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState<any[]>([]);

  async function loadProducts() {
    const res = await api("/products");
    setProducts(res);
  }

  function addToCart(p: any) {
    setCart([...cart, { productId: p.id, qty: 1, price: p.price, name: p.name }]);
  }

  async function checkout() {
    await api("/sales", {
      method: "POST",
      body: JSON.stringify({
        userId: 1,
        items: cart,
        payment: { method: "cash" },
      }),
    });

    alert("Sale Completed!");
    setCart([]);
  }

  useEffect(() => {
    loadProducts();

    socket.on("sale:created", (data) => {
      console.log("New sale:", data);
    });
  }, []);

  return (
    <div className="p-10 flex gap-8">
      {/* Product List */}
      <div className="w-2/3">
        <h1 className="text-xl font-semibold mb-4">Products</h1>

        <div className="grid grid-cols-3 gap-4">
          {products.map((p: any) => (
            <div key={p.id} className="border p-4 rounded bg-white shadow">
              <h2 className="font-semibold">{p.name}</h2>
              <p>${p.price}</p>
              <button
                onClick={() => addToCart(p)}
                className="mt-2 bg-black text-white px-3 py-1 rounded"
              >
                Add
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Cart */}
      <div className="w-1/3 border rounded p-4 h-fit bg-white">
        <h2 className="text-xl font-semibold mb-4">Cart</h2>

        {cart.map((i, idx) => (
          <div key={idx} className="mb-2">
            {i.name} — ${i.price}
          </div>
        ))}

        <button
          onClick={checkout}
          className="mt-4 w-full bg-blue-600 text-white p-2 rounded"
        >
          Checkout
        </button>
      </div>
    </div>
  );
}
