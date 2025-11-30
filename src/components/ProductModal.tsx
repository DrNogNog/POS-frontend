import { useRef, useState } from "react";

// --------------------
// Modal Component
// --------------------
interface ProductModalProps {
  isOpen: boolean;
  close: () => void;
  createProduct: () => void;
  newName: string;
  setNewName: React.Dispatch<React.SetStateAction<string>>;
  newPrice: string;
  setNewPrice: React.Dispatch<React.SetStateAction<string>>;
  newSku?: string;
  setNewSku?: React.Dispatch<React.SetStateAction<string>>;
  newDescription?: string;
  setNewDescription?: React.Dispatch<React.SetStateAction<string>>;
  newCategories?: string;
  setNewCategories?: React.Dispatch<React.SetStateAction<string>>;
  newVendors?: string[];
  setNewVendors?: React.Dispatch<React.SetStateAction<string[]>>;
  newStock?: string;
  setNewStock?: React.Dispatch<React.SetStateAction<string>>;
  images: File[];
  setImages: React.Dispatch<React.SetStateAction<File[]>>;
  handleFiles: (files: FileList | null) => void;
  handleDrop: (e: React.DragEvent<HTMLDivElement>) => void;
  handleDragOver: (e: React.DragEvent<HTMLDivElement>) => void;
}

export default function ProductModal({
  isOpen,
  close,
  createProduct,
  newName,
  setNewName,
  newPrice,
  setNewPrice,
  newSku = "",
  setNewSku = () => {},
  newDescription = "",
  setNewDescription = () => {},
  newCategories = "",
  setNewCategories = () => {},
  newVendors = [],
  setNewVendors = () => {},
  newStock = "0",
  setNewStock = () => {},
  images,
  setImages,
  handleFiles,
  handleDrop,
  handleDragOver,
}: ProductModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const openFileDialog = () => {
    fileInputRef.current?.click();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-start pt-20 z-50">
      <div className="bg-white p-8 rounded-xl max-w-3xl w-full shadow-xl overflow-y-auto max-h-[90vh]">
        <h1 className="text-2xl font-bold mb-6">Create New Item</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <input
            type="text"
            placeholder="Product Name"
            className="border p-3 rounded w-full"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
          <input
            type="number"
            placeholder="Price"
            className="border p-3 rounded w-full"
            value={newPrice}
            onChange={(e) => setNewPrice(e.target.value)}
          />
          <input
            type="text"
            placeholder="SKU"
            className="border p-3 rounded w-full col-span-1 md:col-span-2"
            value={newSku}
            onChange={(e) => setNewSku(e.target.value)}
          />
          <textarea
            placeholder="Description"
            className="border p-3 rounded w-full col-span-1 md:col-span-2 h-20"
            value={newDescription}
            onChange={(e) => setNewDescription(e.target.value)}
          />
          <input
            type="text"
            placeholder="Categories"
            className="border p-3 rounded w-full col-span-1 md:col-span-2"
            value={newCategories}
            onChange={(e) => setNewCategories(e.target.value)}
          />
          <input
            type="text"
            placeholder="Vendors (comma separated)"
            className="border p-3 rounded w-full col-span-1 md:col-span-2"
            value={newVendors.join(",")}
            onChange={(e) => setNewVendors(e.target.value.split(",").map(v => v.trim()))}
          />
          <input
            type="number"
            placeholder="Stock"
            className="border p-3 rounded w-full"
            value={newStock}
            onChange={(e) => setNewStock(e.target.value)}
          />

          {/* Image uploader */}
          <div
            className="border p-3 rounded w-full col-span-1 md:col-span-2 flex flex-col items-center justify-center h-32 text-gray-400 text-center cursor-pointer hover:bg-gray-100 transition"
            onClick={openFileDialog}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
          >
            {images.length === 0
              ? "Drop images here or click to upload"
              : `${images.length} image(s) selected`}
            <input
              type="file"
              multiple
              accept="image/*"
              ref={fileInputRef}
              className="hidden"
              onChange={(e) => handleFiles(e.target.files)}
            />
          </div>

          {images.length > 0 && (
            <div className="col-span-1 md:col-span-2 mt-4 grid grid-cols-3 gap-2">
              {images.map((file, index) => (
                <img
                  key={index}
                  src={URL.createObjectURL(file)}
                  alt={file.name}
                  className="w-full h-24 object-cover rounded"
                />
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button
            className="bg-gray-300 text-black px-4 py-2 rounded hover:bg-gray-400"
            onClick={close}
          >
            Cancel
          </button>
          <button
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
            onClick={createProduct}
          >
            + Add Item
          </button>
        </div>
      </div>
    </div>
  );
}
