import { useRef } from "react";
// --------------------
// Quick Create Form Component
// --------------------
export default function QuickCreateProduct({
  newName,
  setNewName,
  newPrice,
  setNewPrice,
  createProduct,
}: {
  newName: string;
  setNewName: (v: string) => void;
  newPrice: string;
  setNewPrice: (v: string) => void;
  createProduct: () => void;
}) {
  const nameInputRef = useRef<HTMLInputElement>(null);

  const handleContainerClick = () => {
    nameInputRef.current?.focus();
  };

  return (
    <div onClick={handleContainerClick} className="cursor-text">
      <div className="text-xl font-semibold dark:text-white mb-4">
        Quick Create Product
      </div>
      <div className="max-w-2xl bg-white dark:bg-zinc-900 p-6 rounded-2xl shadow-lg mb-10 flex gap-4">
        <input
          ref={nameInputRef}
          type="text"
          className="border p-2 rounded flex-1"
          placeholder="Product Name"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
        />
        <input
          type="number"
          className="border p-2 rounded w-32"
          placeholder="Price"
          value={newPrice}
          onChange={(e) => setNewPrice(e.target.value)}
        />
        <button
          className="bg-green-600 text-white py-2 px-4 rounded hover:bg-green-700"
          onClick={createProduct}
        >
          + Add Items
        </button>
      </div>
    </div>
  );
}