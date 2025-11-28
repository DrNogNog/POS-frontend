"use client";

import { useState, useEffect, useRef } from "react";
import Sidebar from "@/components/sidebar";
import { api } from "@/lib/api";
import ColumnDropdown from "@/components/ColumnDropdown";
import ProductModal from "@/components/ProductModal";
import QuickCreateProduct from "@/components/QuickCreateProduct";
import ProductTableRow from "@/components/ProductTableRow";

// --------------------
// Types
// --------------------
interface Variant {
  size: string;
  sku: string;
  price: number;
}
interface ProductType {
  id: string;
  name: string;
  sku?: string | null;
  price: number;
  description?: string | null;
}
interface Product extends ProductType {
  variants?: Variant[];
}

// --------------------
// Product Table Component
// --------------------
interface ProductTableProps {
  products: Product[];
  visibleColumns: Set<string>;
  openIds: Set<string>;
  toggleOpen: (id: string) => void;
  editProduct: (id: string) => void;
  duplicateProduct: (product: Product) => void;
  deleteProduct: (id: string) => void;
  orderMore: (id: string) => void;
  setNonTaxable: (id: string) => void;
  archiveProduct: (id: string) => void;
  updateLowStockAlert: (id: string) => void;
}

function ProductTable({
  products,
  visibleColumns,
  editProduct,
  duplicateProduct,
  deleteProduct,
  orderMore,
  setNonTaxable,
  archiveProduct,
  updateLowStockAlert,
}: ProductTableProps) {
  return (
    <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-xl border">
      {/* Scrollable container */}
      <div className="max-h-[800px] overflow-y-auto">
        <table className="w-full">
          <thead className="bg-zinc-50 dark:bg-zinc-800 border-b sticky top-0 z-10">
            <tr>
              {visibleColumns.has("Item") && <th className="px-6 py-3 text-left">Item</th>}
              {visibleColumns.has("SKU") && <th className="px-6 py-3 text-left">SKU</th>}
              {visibleColumns.has("Price") && <th className="px-6 py-3 text-right">Price</th>}
              {visibleColumns.has("Actions") && <th className="px-6 py-3 text-right">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-700">
            {products.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-12 text-center text-zinc-500 dark:text-zinc-400">
                  No products yet. Add one above!
                </td>
              </tr>
            ) : (
              products.map((product) => (
                <ProductTableRow
                  key={product.id}
                  product={product}
                  visibleColumns={visibleColumns}
                  editProduct={editProduct}
                  duplicateProduct={duplicateProduct}
                  deleteProduct={deleteProduct}
                  orderMore={orderMore}
                  setNonTaxable={setNonTaxable}
                  archiveProduct={archiveProduct}
                  updateLowStockAlert={updateLowStockAlert}
                />
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// --------------------
// Main Products Page
// --------------------
export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [activePage, setActivePage] = useState("Item Library");
  const [openIds, setOpenIds] = useState<Set<string>>(new Set());
  const [newName, setNewName] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [newSku, setNewSku] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [images, setImages] = useState<File[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const allColumns = ["Item", "SKU", "Price", "Actions"];
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(
    new Set(allColumns)
  );

  // --------------------
  // CRUD Actions
  // --------------------
  const deleteProduct = (id: string) => {
    fetch(`http://localhost:4000/api/products/${id}`, { method: "DELETE" })
      .then(() => setProducts((prev) => prev.filter((p) => p.id !== id)))
      .catch(console.error);
  };

  const duplicateProduct = async (product: Product) => {
  try {
    const formData = new FormData();
    formData.append("name", product.name + " (Copy)");
    formData.append("price", product.price.toString());
    if (product.sku) formData.append("sku", product.sku);
    if (product.description) formData.append("description", product.description);

    // No images for duplicate (optional)
    // if you want to copy images, you need file blobs

    const res = await fetch("http://localhost:4000/api/products", {
      method: "POST",
      body: formData, // do NOT set Content-Type manually
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Failed to duplicate product: ${text}`);
    }

    const newProduct = await res.json();
    setProducts((prev) => [...prev, newProduct]);
  } catch (err) {
    console.error("Failed to duplicate product", err);
  }
};


  const editProduct = (id: string) => console.log("Edit", id);
  const orderMore = (id: string) => console.log("Order more", id);
  const setNonTaxable = (id: string) => console.log("Set non-taxable", id);
  const archiveProduct = (id: string) => console.log("Archive", id);
  const updateLowStockAlert = (id: string) => console.log("Update low stock alert", id);

  const toggleOpen = (id: string) => {
    setOpenIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const modalOpen = () => setIsModalOpen(true);
  const modalClose = () => {
    setIsModalOpen(false);
    setImages([]);
  };

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    setImages((prev) => [...prev, ...Array.from(files)]);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    handleFiles(e.dataTransfer.files);
  };
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => e.preventDefault();
  const openFileDialog = () => fileInputRef.current?.click();

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

  async function createProduct() {
    if (!newName.trim() || !newPrice.trim()) {
      alert("Name and Price are required.");
      return;
    }

    const formData = new FormData();
    formData.append("name", newName.trim());
    formData.append("price", newPrice.trim());
    if (newSku.trim()) formData.append("sku", newSku.trim());
    if (newDescription.trim()) formData.append("description", newDescription.trim());
    images.forEach((img) => formData.append("images", img));

    try {
      await fetch("http://localhost:4000/api/products", {
        method: "POST",
        body: formData, // DO NOT set Content-Type manually
      });

      // reset
      setNewName("");
      setNewPrice("");
      setNewSku("");
      setNewDescription("");
      setImages([]);
      modalClose();
      load(); // refresh table after creation
    } catch (err) {
      console.error(err);
    }
  }

  useEffect(() => {
    if (activePage === "Item Library") load();
  }, [activePage]);

  return (
    <div className="flex min-h-screen bg-zinc-100 dark:bg-black">
      <Sidebar/>
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

            {/* Modals */}
            <ProductModal
              isOpen={isModalOpen}
              close={modalClose}
              createProduct={createProduct}
              newName={newName}
              setNewName={setNewName}
              newPrice={newPrice}
              setNewPrice={setNewPrice}
              newSku={newSku}
              setNewSku={setNewSku}
              newDescription={newDescription}
              setNewDescription={setNewDescription}
              images={images}
              setImages={setImages}
              handleFiles={handleFiles}
              handleDrop={handleDrop}
              handleDragOver={handleDragOver}
            />

            <QuickCreateProduct
              newName={newName}
              setNewName={setNewName}
              newPrice={newPrice}
              setNewPrice={setNewPrice}
              createProduct={createProduct}
            />

            <div className="flex justify-end mb-4">
              <ColumnDropdown
                options={allColumns}
                selected={visibleColumns}
                setSelected={setVisibleColumns}
              />
            </div>

            {/* Product Table */}
            <ProductTable
              products={products}
              openIds={openIds}
              toggleOpen={toggleOpen}
              visibleColumns={visibleColumns}
              editProduct={editProduct}
              duplicateProduct={duplicateProduct}
              deleteProduct={deleteProduct}
              orderMore={orderMore}
              setNonTaxable={setNonTaxable}
              archiveProduct={archiveProduct}
              updateLowStockAlert={updateLowStockAlert}
            />
          </div>
        )}
      </main>
    </div>
  );
}
