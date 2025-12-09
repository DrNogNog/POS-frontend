"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import Sidebar from "@/components/sidebar";
import { api } from "@/lib/api";
import ColumnDropdown from "@/components/ColumnDropdown";
import ProductModal from "@/components/ProductModal";
import ProductTableRow, { Product } from "@/components/ProductTableRow";
import { useAlerts } from "@/lib/AlertsContext";

interface Order {
  id: number;
  name: string;
  description?: string | null;
  vendors?: string | null;
  count: number;
  createdAt: string;
  invoiceNo?: string | null;
}

// OrderMore Modal Component
function OrderMoreModal({
  isOpen,
  close,
  product,
  onSubmit,
}: {
  isOpen: boolean;
  close: () => void;
  product: Product | null;
  onSubmit: (product: Product, count: number) => void;
}) {
  const [count, setCount] = useState<number>(1);

  if (!isOpen || !product) return null;

  const totalCost = (Number(product.inputcost) || 0) * count;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (count < 1) {
      alert("Please enter at least 1 item.");
      return;
    }
    onSubmit(product, count);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white dark:bg-zinc-900 p-8 rounded-2xl shadow-2xl w-full max-w-md">
        <h2 className="text-2xl font-bold mb-6 dark:text-white">
          Order More: {product.name}
        </h2>

        {product.description && (
          <p className="text-sm text-gray-600 dark:text-zinc-400 mb-3 italic">
            {product.description}
          </p>
        )}

        {product.vendors && product.vendors.length > 0 && (
          <p className="mb-3 text-sm">
            <span className="font-medium dark:text-zinc-300">Vendor:</span>{" "}
            <span className="text-gray-700 dark:text-zinc-400">
              {product.vendors.join(", ")}
            </span>
          </p>
        )}

        <div className="bg-gray-50 dark:bg-zinc-800 p-4 rounded-lg mb-6">
          <div className="flex justify-between items-center mb-2">
            <span className="font-medium">Cost per item:</span>
            <span className="text-lg">${Number(product.inputcost).toFixed(2)}</span>
          </div>
          <div className="flex justify-between items-center text-xl font-bold">
            <span>Total cost:</span>
            <span className="text-green-600">${totalCost.toFixed(2)}</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium mb-2 dark:text-white">
              How many to order?
            </label>
            <input
              type="number"
              min="1"
              value={count}
              onChange={(e) => setCount(Math.max(1, Number(e.target.value) || 1))}
              className="w-full px-4 py-3 text-lg rounded-lg border border-zinc-300 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
              autoFocus
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={close}
              className="px-6 py-3 rounded-lg bg-zinc-200 dark:bg-zinc-700 hover:bg-zinc-300 dark:hover:bg-zinc-600 text-zinc-800 dark:text-white font-medium transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-8 py-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium transition shadow-md"
            >
              Create Purchase Order
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ProductsPage() {
  const { updateLowStockAlert } = useAlerts();
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [activePage, setActivePage] = useState("Item Library");
  const [openIds, setOpenIds] = useState<Set<string>>(new Set());
  const [newName, setNewName] = useState("");
  const [newInputCost, setNewInputCost] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newVendors, setNewVendors] = useState<string[]>([]);
  const [newStock, setNewStock] = useState("0");
  const [images, setImages] = useState<File[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [orderModalProduct, setOrderModalProduct] = useState<Product | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const allColumns = [
    "Item",
    "Description",
    "Cost",
    "Stock",
    "Vendors",
    "Actions",
  ];

  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(new Set(allColumns));

  // Load products
  const loadProducts = async () => {
    try {
      const res = await api("/products");
      const data: any[] = Array.isArray(res) ? res : [];

      const normalized: Product[] = data.map((p) => ({
        ...p,
        id: String(p.id),
        inputcost: Number(p.inputcost || 0),
        stock: p.stock ?? 0,
        vendors: p.vendors ?? [],
      }));

      setProducts(normalized);
    } catch {
      setProducts([]);
    }
  };

  useEffect(() => {
    if (activePage === "Item Library") loadProducts();
  }, [activePage]);

  const filteredProducts = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return products;
    return products.filter((p) =>
      p.name.toLowerCase().includes(query) ||
      p.description?.toLowerCase().includes(query) ||
      p.vendors?.some((v) => v.toLowerCase().includes(query))
    );
  }, [searchQuery, products]);

  const updateProductInState = (updated: Product) => {
    setProducts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
  };

  const deleteProduct = async (id: string) => {
    try {
      await fetch(`http://localhost:4000/api/products/${id}`, { method: "DELETE" });
      setProducts((prev) => prev.filter((p) => p.id !== id));
    } catch {}
  };

  const duplicateProduct = async (product: Product) => {
    try {
      const body = {
        name: product.name,
        inputcost: product.inputcost,
        description: product.description,
        stock: product.stock,
        vendors: product.vendors,
        images: product.images,
      };

      const res = await fetch("http://localhost:4000/api/products/duplicate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const newProduct = await res.json();
      newProduct.id = String(newProduct.id);

      setProducts((prev) => [...prev, newProduct]);
    } catch {}
  };

  const editProduct = async (product: Product) => {
    try {
      const form = new FormData();
      form.append("name", product.name);
      form.append("inputcost", String(product.inputcost));
      if (product.description) form.append("description", product.description);
      if (product.stock !== undefined) form.append("stock", product.stock.toString());
      if (product.vendors) form.append("vendors", product.vendors.join(","));
      if (product.images) product.images.forEach((img) => form.append("images", img as any));

      const res = await fetch(`http://localhost:4000/api/products/${product.id}`, {
        method: "PUT",
        body: form,
      });

      const saved = await res.json();
      saved.id = String(saved.id);
      updateProductInState(saved);
    } catch {
      alert("Failed to update product");
    }
  };

  const orderMore = (p: Product) => setOrderModalProduct(p);
  const closeOrderModal = () => setOrderModalProduct(null);

  const handleOrderMoreSubmit = async (product: Product, count: number) => {
    if (!product) return;
    try {
      await fetch(`http://localhost:4000/api/products/needToOrder/${product.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ needToOrder: count }),
      });
      setProducts((prev) =>
        prev.map((p) => (p.id === product.id ? { ...p, needToOrder: count } : p))
      );
      closeOrderModal();
    } catch {
      alert("Failed to save");
    }
  };

  const createProduct = async () => {
    if (!newName.trim() || !newInputCost.trim()) {
      alert("Name and Cost are required.");
      return;
    }

    const formData = new FormData();
    formData.append("name", newName.trim());
    formData.append("inputcost", newInputCost.trim());
    formData.append("stock", newStock);
    formData.append("needToOrder", "0");
    if (newDescription.trim()) formData.append("description", newDescription.trim());
    if (newVendors.length > 0) formData.append("vendors", newVendors.join(","));
    images.forEach((img) => formData.append("images", img));

    try {
      const res = await fetch("http://localhost:4000/api/products", {
        method: "POST",
        body: formData,
      });
      const created = await res.json();
      created.id = String(created.id);

      setProducts((prev) => [...prev, created]);
      loadProducts();
      setNewName("");
      setNewInputCost("");
      setNewDescription("");
      setNewVendors([]);
      setNewStock("0");
      setImages([]);
      setIsModalOpen(false);
    } catch {
      alert("Failed to save product");
    }
  };

  return (
    <div className="flex min-h-screen bg-zinc-100 dark:bg-black">
      <Sidebar />
      <main className="flex-1 p-10">
        {activePage === "Item Library" && (
          <div className="mx-auto max-w-6xl">
            <h1 className="text-3xl font-bold mb-8">Item Library</h1>

            <div className="max-w-md mx-auto bg-white dark:bg-zinc-900 p-6 rounded-2xl shadow-lg mb-6 flex flex-col items-center gap-4">
              <h2 className="text-xl font-semibold dark:text-white text-center">
                Your Item Library
              </h2>
              <button
                className="bg-blue-600 text-white px-8 py-3 rounded hover:bg-blue-700"
                onClick={() => setIsModalOpen(true)}
              >
                Create an Item
              </button>
            </div>

            <div className="max-w-md mx-auto mb-4 space-y-2">
              <input
                type="text"
                placeholder="Search by name, description, or vendor..."
                className="w-full px-4 py-3 rounded-lg border border-zinc-300 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <ProductModal
              isOpen={isModalOpen}
              close={() => setIsModalOpen(false)}
              createProduct={createProduct}
              newName={newName}
              setNewName={setNewName}
              newInputCost={newInputCost}
              setNewInputCost={setNewInputCost}
              newDescription={newDescription}
              setNewDescription={setNewDescription}
              newVendors={newVendors}
              setNewVendors={setNewVendors}
              newStock={newStock}
              setNewStock={setNewStock}
              images={images}
              setImages={setImages}
              handleFiles={(f) => setImages([...images, ...Array.from(f || [])])}
              handleDrop={(e) => {
                e.preventDefault();
                const files = e.dataTransfer.files;
                setImages([...images, ...Array.from(files)]);
              }}
              handleDragOver={(e) => e.preventDefault()}
            />

            <div className="flex justify-end mb-4">
              <ColumnDropdown
                options={allColumns}
                selected={visibleColumns}
                setSelected={setVisibleColumns}
              />
            </div>

            <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-xl border">
              <div className="h-[calc(100vh-150px)] overflow-y-auto">
                <table className="w-full">
                  <thead className="bg-zinc-50 dark:bg-zinc-800 border-b sticky top-0 z-10">
                    <tr>
                      {allColumns.map((col) =>
                        visibleColumns.has(col) ? (
                          <th
                            key={col}
                            className={`px-6 py-4 ${
                              col === "Stock" || col === "Cost" ? "text-right" : "text-left"
                            }`}
                          >
                            {col}
                          </th>
                        ) : null
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProducts.map((product) => (
                      <ProductTableRow
                        key={product.id}
                        product={product}
                        visibleColumns={visibleColumns}
                        deleteProduct={deleteProduct}
                        duplicateProduct={duplicateProduct}
                        editProduct={editProduct}
                        orderMore={() => orderMore(product)}
                        setNonTaxable={(id) => console.log("setNonTaxable", id)}
                        archiveProduct={(id) => console.log("archiveProduct", id)}
                        updateLowStockAlert={updateLowStockAlert}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <OrderMoreModal
              isOpen={!!orderModalProduct}
              close={closeOrderModal}
              product={orderModalProduct}
              onSubmit={handleOrderMoreSubmit}
            />
          </div>
        )}
      </main>
    </div>
  );
}
