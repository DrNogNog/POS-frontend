import { useRef, useState } from "react";
import { X, Upload, Trash2 } from "lucide-react";

export interface ProductModalProps {
  isOpen: boolean;
  close: () => void;
  createProduct: () => Promise<void>;
  isLoading?: boolean;

  // Form fields
  newName: string;
  setNewName: React.Dispatch<React.SetStateAction<string>>;
  newDescription: string;
  setNewDescription: React.Dispatch<React.SetStateAction<string>>;
  newVendors: string[];
  setNewVendors: React.Dispatch<React.SetStateAction<string[]>>;
  newStock: string;
  setNewStock: React.Dispatch<React.SetStateAction<string>>;
  newInputCost: string;
  setNewInputCost: React.Dispatch<React.SetStateAction<string>>;

  // Images
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
  isLoading = false,
  newName,
  setNewName,
  newDescription,
  setNewDescription,
  newVendors,
  setNewVendors,
  newStock,
  setNewStock,
  newInputCost,
  setNewInputCost,
  images,
  setImages,
  handleFiles,
  handleDrop,
  handleDragOver,
}: ProductModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [vendorsInput, setVendorsInput] = useState<string>(newVendors.join(", "));

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-zinc-200 dark:border-zinc-800">
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">
            Create New Product
          </h2>
          <button
            onClick={close}
            className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Grid: Two columns */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                Product Name *
              </label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                placeholder="e.g. B9-CC-CR (Item-Vendor-Style)"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                Stock Quantity
              </label>
              <input
                type="number"
                value={newStock}
                onChange={(e) => setNewStock(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                placeholder="100"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                Cost Price ($)
              </label>
              <input
                type="number"
                step="0.01"
                value={newInputCost}
                onChange={(e) => setNewInputCost(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                placeholder="12.50"
              />
            </div>
          </div>

          {/* Full width fields */}
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                Description
              </label>
              <textarea
                rows={4}
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition resize-none"
                placeholder="Describe your product..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                Vendors / Suppliers (comma separated)
              </label>
              <input
                type="text"
                value={vendorsInput}
                onChange={(e) => setVendorsInput(e.target.value)}
                onBlur={() =>
                  setNewVendors(
                    vendorsInput
                      .split(",")
                      .map((v) => v.trim())
                      .filter(Boolean)
                  )
                }
                className="w-full px-4 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                placeholder="Alpha Cabinets, Global Cabinets"
              />
            </div>
          </div>

          {/* Image Upload */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-3">
              Product Images {images.length > 0 && `(${images.length})`}
            </label>

            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-zinc-300 dark:border-zinc-700 rounded-2xl p-8 text-center cursor-pointer hover:border-blue-500 dark:hover:border-blue-400 transition-colors bg-zinc-50/50 dark:bg-zinc-800/50"
            >
              <Upload className="w-12 h-12 mx-auto mb-4 text-zinc-400" />
              <p className="text-zinc-600 dark:text-zinc-400">
                Drop images here or{" "}
                <span className="text-blue-600 font-medium">click to browse</span>
              </p>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*"
                onChange={(e) => handleFiles(e.target.files)}
                className="hidden"
              />
            </div>

            {images.length > 0 && (
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-3 mt-4">
                {images.map((file, index) => (
                  <div
                    key={index}
                    className="relative group rounded-lg overflow-hidden bg-zinc-100 dark:bg-zinc-800"
                  >
                    <img
                      src={URL.createObjectURL(file)}
                      alt={`Preview ${index + 1}`}
                      className="w-full h-28 object-cover rounded-lg"
                    />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeImage(index);
                      }}
                      className="absolute top-1 right-1 p-1.5 bg-red-500 text-white rounded-md opacity-0 group-hover:opacity-100 transition-opacity shadow-lg hover:bg-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-900/70 rounded-b-2xl">
          <button
            onClick={close}
            disabled={isLoading}
            className="px-6 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={createProduct}
            disabled={isLoading || !newName}
            className="px-8 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isLoading ? <>Saving...</> : <span>Save Product</span>}
          </button>
        </div>
      </div>
    </div>
  );
}
