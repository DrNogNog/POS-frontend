"use client";

import { useState, useEffect, Fragment, useRef } from "react";
import Sidebar from "@/components/sidebar";
import { api } from "@/lib/api";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Menu } from "@headlessui/react";

// --------------------
// Types
// --------------------
interface Variant {
  size: string;
  sku: string;
  price: number;
}

interface Product {
  id: string;
  name: string;
  sku: string;
  price: number;
  variants?: Variant[];
}

// --------------------
// Product Table Row Component
// --------------------
function ProductTableRow({
  product,
  openIds,
  toggleOpen,
}: {
  product: Product;
  openIds: Set<string>;
  toggleOpen: (id: string) => void;
}) {
  return (
    <Fragment>
      <tr
        className="hover:bg-zinc-50 dark:hover:bg-zinc-800 cursor-pointer"
        onClick={() => product.variants && toggleOpen(product.id)}
      >
        <td className="px-6 py-4 flex items-center gap-3">
          {product.variants ? (
            openIds.has(product.id) ? (
              <ChevronDown className="h-5 w-5 text-zinc-500" />
            ) : (
              <ChevronRight className="h-5 w-5 text-zinc-500" />
            )
          ) : (
            <span className="w-5" />
          )}
          <span className="font-medium">{product.name}</span>
        </td>
        <td className="px-6 py-4 font-mono text-sm text-zinc-600 dark:text-zinc-400">
          {product.sku}
        </td>
        <td className="px-6 py-4 text-right font-semibold">${product.price.toFixed(2)}</td>
        <td className="px-6 py-4 text-right">
          <Menu as="div" className="relative inline-block text-left">
            <Menu.Button className="inline-flex justify-center w-full rounded-md p-1 hover:bg-zinc-200 dark:hover:bg-zinc-700">
              <span className="sr-only">Open options</span>
              <svg className="w-5 h-5 text-zinc-500" fill="currentColor" viewBox="0 0 20 20">
                <path d="M6 10a2 2 0 114 0 2 2 0 01-4 0zm4 0a2 2 0 114 0 2 2 0 01-4 0zM2 10a2 2 0 114 0 2 2 0 01-4 0z" />
              </svg>
            </Menu.Button>
            <Menu.Items className="absolute right-0 mt-2 w-56 origin-top-right bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 divide-y divide-zinc-100 dark:divide-zinc-700 rounded-md shadow-lg focus:outline-none z-50">
              <div className="px-1 py-1">
                {[
                  "Edit",
                  "Delete",
                  "Duplicate",
                  "Order More",
                  "Update Categories",
                  "Set as Non-Taxable",
                  "Archive",
                  "Update Low Stock Alert",
                ].map((action) => (
                  <Menu.Item key={action}>
                    {({ active }) => (
                      <button
                        className={`${
                          active ? "bg-zinc-100 dark:bg-zinc-700" : ""
                        } group flex rounded-md items-center w-full px-2 py-2 text-sm`}
                        onClick={() => console.log(`${action} clicked for ${product.name}`)}
                      >
                        {action}
                      </button>
                    )}
                  </Menu.Item>
                ))}
              </div>
            </Menu.Items>
          </Menu>
        </td>
      </tr>

      {/* Variants */}
      {product.variants &&
        openIds.has(product.id) &&
        product.variants.map((v, i) => (
          <tr key={`${product.id}-${i}`} className="bg-zinc-50 dark:bg-zinc-800">
            <td className="px-6 py-3 pl-16 text-sm text-zinc-600 dark:text-zinc-400">
              Size {v.size}
            </td>
            <td className="px-6 py-3 font-mono text-sm">{v.sku}</td>
            <td className="px-6 py-3 text-right text-sm">${v.price.toFixed(2)}</td>
            <td></td>
          </tr>
        ))}
    </Fragment>
  );
}

// --------------------
// Product Table Component
// --------------------
function ProductTable({
  products,
  openIds,
  toggleOpen,
}: {
  products: Product[];
  openIds: Set<string>;
  toggleOpen: (id: string) => void;
}) {
  return (
    <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-xl border">
      <table className="w-full">
        <thead className="bg-zinc-50 dark:bg-zinc-800 border-b">
          <tr>
            <th className="px-6 py-4 text-left text-xs font-medium text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">
              Item
            </th>
            <th className="px-6 py-4 text-left text-xs font-medium text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">
              SKU
            </th>
            <th className="px-6 py-4 text-right text-xs font-medium text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">
              Price
            </th>
            <th className="px-6 py-4 text-right text-xs font-medium text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-200 dark:divide-zinc-700">
          {products.length === 0 ? (
            <tr>
              <td colSpan={4} className="px-6 py-12 text-center text-zinc-500">
                No products yet. Add one above!
              </td>
            </tr>
          ) : (
            products.map((product) => (
              <ProductTableRow
                key={product.id}
                product={product}
                openIds={openIds}
                toggleOpen={toggleOpen}
              />
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

// --------------------
// Modal Component
// --------------------
interface ProductModalProps {
  isOpen: boolean;
  close: () => void;
  createProduct: () => void;
  newName: string;
  setNewName: (v: string) => void;
  newPrice: string;
  setNewPrice: (v: string) => void;
  images: File[];
  setImages: React.Dispatch<React.SetStateAction<File[]>>;
  handleFiles: (files: FileList | null) => void;
  handleDrop: (e: React.DragEvent<HTMLDivElement>) => void;
  handleDragOver: (e: React.DragEvent<HTMLDivElement>) => void;
}
function ProductModal({
  isOpen,
  close,
  createProduct,
  newName,
  setNewName,
  newPrice,
  setNewPrice,
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
          <textarea
            placeholder="Description"
            className="border p-3 rounded w-full col-span-1 md:col-span-2"
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
              ref={fileInputRef} // ✅ attach ref
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

        <div className="space-y-4">
          <h1 className="text-xl font-semibold">Taxes</h1>
          <h1 className="text-xl font-semibold">Manage Inventory</h1>
          <h1 className="text-xl font-semibold">Variations</h1>
          <h1 className="text-xl font-semibold">Modifiers</h1>
          <h1 className="text-xl font-semibold">Bundle</h1>
          <h1 className="text-xl font-semibold">Customer Attributes</h1>
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

// --------------------
// Quick Create Form Component
// --------------------
function QuickCreateProduct({
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
          + Add Item
        </button>
      </div>
    </div>
  );
}



// --------------------
// Main Products Page
// --------------------
export default function ProductsPage() {
  const [activePage, setActivePage] = useState("Item Library");
  const [products, setProducts] = useState<Product[]>([]);
  const [openIds, setOpenIds] = useState<Set<string>>(new Set());
  const [newName, setNewName] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [images, setImages] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const modalOpen = () => setIsModalOpen(true);
  const modalClose = () => {
    setIsModalOpen(false);
    setImages([]);
  };

  const toggleOpen = (id: string) => {
    setOpenIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  async function load() {
    try {
      const res = await api("/products");
      const data = Array.isArray(res) ? res : [];
      setProducts(data.map((p) => ({ ...p, price: Number(p.price || 0) })));
    } catch (err) {
      console.error(err);
      setProducts([]);
    }
  }

  const handleFiles = (selectedFiles: FileList | null) => {
    if (!selectedFiles) return;
    setImages((prev) => [...prev, ...Array.from(selectedFiles)]);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    handleFiles(e.dataTransfer.files);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const openFileDialog = () => {
    fileInputRef.current?.click();
  };

  async function createProduct() {
    if (!newName.trim() || !newPrice) return;

    const formData = new FormData();
    formData.append("name", newName.trim());
    formData.append("price", newPrice);
    images.forEach((img) => formData.append("images", img));

    try {
      await api("/products", { method: "POST", body: formData });
      setNewName("");
      setNewPrice("");
      setImages([]);
      modalClose();
      load();
    } catch (err) {
      console.error(err);
    }
  }

  useEffect(() => {
    if (activePage === "Item Library") load();
  }, [activePage]);

  return (
    <div className="flex min-h-screen bg-zinc-100 dark:bg-black">
      <Sidebar onSelectPage={setActivePage} activePage={activePage} />
      <main className="flex-1 p-10">
        {activePage === "Item Library" && (
          <div className="mx-auto max-w-6xl">
            <h1 className="text-3xl font-bold mb-8">Item Library</h1>

            {/* Item Library Box */}
            <div className="max-w-md mx-auto bg-white dark:bg-zinc-900 p-6 rounded-2xl shadow-lg mb-6 flex flex-col items-center gap-4">
              <h2 className="text-xl font-semibold dark:text-white text-center">
                Your Item Library
              </h2>
              <button
                className="bg-blue-600 text-white px-8 py-3 rounded hover:bg-blue-700"
                onClick={modalOpen}
              >
                Create an Item
              </button>
            </div>

            {/* Modal */}
            <ProductModal
              isOpen={isModalOpen}
              close={modalClose}
              createProduct={createProduct}
              newName={newName}
              setNewName={setNewName}
              newPrice={newPrice}
              setNewPrice={setNewPrice}
              images={images}
              setImages={setImages}
              handleFiles={handleFiles}
              handleDrop={handleDrop}
              handleDragOver={handleDragOver}
              openFileDialog={openFileDialog}
            />

            {/* Quick Create */}
            <QuickCreateProduct
              newName={newName}
              setNewName={setNewName}
              newPrice={newPrice}
              setNewPrice={setNewPrice}
              createProduct={createProduct}
            />

            {/* Product Table */}
            <ProductTable products={products} openIds={openIds} toggleOpen={toggleOpen} />
          </div>
        )}
      </main>
    </div>
  );
}
