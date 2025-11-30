"use client";

import { useState } from "react";

interface OrderMoreProps {
  productId: string;
  name: string;
  description?: string;
  onClose: () => void;
  onSubmit: (count: number) => void;
}

export default function OrderMore({ productId, name, description, onClose, onSubmit }: OrderMoreProps) {
  const [count, setCount] = useState(1);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (count < 1) return alert("Quantity must be at least 1");
    onSubmit(count);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl w-96 shadow-lg">
        <h2 className="text-xl font-semibold mb-2">Order More: {name}</h2>
        {description && <p className="mb-4 text-zinc-600 dark:text-zinc-300">{description}</p>}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <label className="flex flex-col text-sm">
            Quantity
            <input
              type="number"
              min={1}
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
              className="mt-1 px-3 py-2 border rounded dark:bg-zinc-800 dark:border-zinc-700 dark:text-white"
            />
          </label>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded bg-zinc-300 dark:bg-zinc-700">
              Cancel
            </button>
            <button type="submit" className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700">
              Order
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
