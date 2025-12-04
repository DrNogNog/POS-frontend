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
  sku: string;
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

        {product.style && (
          <p className="text-lg font-medium text-blue-600 dark:text-blue-400 mb-2">
            {product.style}
          </p>
        )}

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
              className="w-full px-4 py-3 text-lg rounded-lg border border-zinc-300 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white focus:ring-2 focus:ring-blue-500"
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
  const [newStyle, setNewStyle] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [newInputCost, setNewInputCost] = useState("");
  const [newSku, setNewSku] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newCategories, setNewCategories] = useState("");
  const [newVendors, setNewVendors] = useState<string[]>([]);
  const [newStock, setNewStock] = useState("0");
  const [images, setImages] = useState<File[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [orderModalProduct, setOrderModalProduct] = useState<Product | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const allColumns = [
    "Item",
    "Style",
    "Description",
    "Cost",
    "SKU",
    "Price",
    "Categories",
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
      const productsWithDefaults: Product[] = data.map((p) => ({
        ...p,
        id: String(p.id),
        price: Number(p.price || 0),
        inputcost: Number(p.inputcost || 0),
        style: p.style || "",
        stock: p.stock ?? 0,
        categories: p.categories ?? "",
        vendors: p.vendors ?? [],
      }));
      setProducts(productsWithDefaults);
    } catch (err) {
      console.error(err);
      setProducts([]);
    }
  };

  useEffect(() => {
    if (activePage === "Item Library") loadProducts();
  }, [activePage]);

  const filteredProducts = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return products;
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(query) ||
        p.sku?.toLowerCase().includes(query) ||
        p.categories?.toLowerCase().includes(query) ||
        p.vendors?.some((v) => v.toLowerCase().includes(query))
    );
  }, [searchQuery, products]);

  const updateProductInState = (updatedProduct: Product) => {
    setProducts((prev) => prev.map((p) => (p.id === updatedProduct.id ? updatedProduct : p)));
  };

  const deleteProduct = async (id: string) => {
    try {
      await fetch(`http://localhost:4000/api/products/${id}`, { method: "DELETE" });
      setProducts((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const duplicateProduct = async (product: Product) => {
    try {
      const formData = new FormData();
      formData.append("name", product.name + " (Copy)");
      formData.append("style", product.style);
      formData.append("price", product.price.toString());
      formData.append("inputcost", String(product.inputcost));
      if (product.sku) formData.append("sku", product.sku);
      if (product.description) formData.append("description", product.description);
      if (product.categories) formData.append("categories", product.categories);
      if (product.stock !== undefined) formData.append("stock", product.stock.toString());
      if (product.vendors) formData.append("vendors", product.vendors.join(","));
      if (product.images) product.images.forEach((img) => formData.append("images", img as any));

      const res = await fetch("http://localhost:4000/api/products", { method: "POST", body: formData });
      if (!res.ok) throw new Error("Failed to duplicate product");
      const newProduct: Product = await res.json();
      newProduct.id = String(newProduct.id);
      setProducts((prev) => [...prev, newProduct]);
    } catch (err) {
      console.error(err);
    }
  };

  const editProduct = async (updatedProduct: Product) => {
    try {
      const formData = new FormData();
      formData.append("name", updatedProduct.name);
      formData.append("style", updatedProduct.style);
      formData.append("price", updatedProduct.price.toString());
      formData.append("inputcost", String(updatedProduct.inputcost));
      if (updatedProduct.sku) formData.append("sku", updatedProduct.sku);
      if (updatedProduct.description) formData.append("description", updatedProduct.description || "");
      if (updatedProduct.categories) formData.append("categories", updatedProduct.categories);
      if (updatedProduct.stock !== undefined) formData.append("stock", updatedProduct.stock.toString());
      if (updatedProduct.vendors) formData.append("vendors", updatedProduct.vendors.join(","));
      if (updatedProduct.images) updatedProduct.images.forEach((img) => formData.append("images", img as any));

      const res = await fetch(`http://localhost:4000/api/products/${updatedProduct.id}`, {
        method: "PUT",
        body: formData,
      });

      if (!res.ok) throw new Error("Failed to update product");
      const savedProduct: Product = await res.json();
      savedProduct.id = String(savedProduct.id);
      updateProductInState(savedProduct);
    } catch (err) {
      console.error(err);
      alert("Failed to save changes to the product.");
    }
  };

  // OrderMore modal handling
  const orderMore = (product: Product) => setOrderModalProduct(product);
  const closeOrderModal = () => setOrderModalProduct(null);

const handleOrderMoreSubmit = async (product: Product, count: number) => {
  if (!product || count < 1) return;

  try {
    // Just update the product with the new needToOrder value
    const response = await fetch(`http://localhost:4000/api/products/needToOrder/${product.id}`, {
      method: "PATCH", // or "PUT" if your backend prefers
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        needToOrder: count, // This assumes you already added this field in your DB
      }),
    });
    if (!response.ok) {
      throw new Error("Failed to update needToOrder");
    }

    // Update the product in local state so UI updates instantly
    setProducts((prev) =>
      prev.map((p) =>
        p.id === product.id ? { ...p, needToOrder: count } : p
      )
    );
    setOrderModalProduct(null); // close modal
  } catch (err) {
    console.error(err);
    alert("Failed to save. Check console.");
  }
};


  const setNonTaxable = (id: string) => console.log("Set non-taxable", id);

  const archiveProduct = async (id: string) => {
    // ... (unchanged)
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
const createProduct = async () => {
  if (!newName.trim() || !newPrice.trim() || !newInputCost.trim()) {
    alert("Name, Price, and Cost are required.");
    return;
  }

  const formData = new FormData();
  formData.append("name", newName.trim());
  formData.append("style", newStyle.trim());
  formData.append("price", newPrice.trim());
  formData.append("inputcost", newInputCost.trim());
  formData.append("stock", newStock || "0");
  formData.append("needToOrder", "0"); // ← important: send the field!

  if (newSku.trim()) formData.append("sku", newSku.trim());
  if (newDescription.trim()) formData.append("description", newDescription.trim());
  if (newCategories.trim()) formData.append("categories", newCategories.trim());
  if (newVendors.length > 0) formData.append("vendors", newVendors.join(","));

  images.forEach((img) => formData.append("images", img));

  try {
    const res = await fetch("http://localhost:4000/api/products", {
      method: "POST",
      body: formData,
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({}));
      throw new Error(error.message || "Failed to create product");
    }

    const newProduct: Product = await res.json();
    newProduct.id = String(newProduct.id);

    // Add to list + refresh
    setProducts((prev) => [...prev, newProduct]);
    loadProducts(); // optional: refresh from server

    // Reset form
    setNewName("");
    setNewStyle("");
    setNewPrice("");
    setNewInputCost("");
    setNewSku("");
    setNewDescription("");
    setNewCategories("");
    setNewVendors([]);
    setNewStock("0");
    setImages([]);
    modalClose();

    alert("Product created successfully!");
  } catch (err: any) {
    console.error(err);
    alert("Failed to save product: " + err.message);
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
              <h2 className="text-xl font-semibold dark:text-white text-center">Your Item Library</h2>
              <button className="bg-blue-600 text-white px-8 py-3 rounded hover:bg-blue-700" onClick={modalOpen}>
                Create an Item
              </button>
            </div>

            <div className="max-w-md mx-auto mb-4">
              <input
                type="text"
                placeholder="Search by name, SKU, category, or vendor..."
                className="w-full px-4 py-3 rounded-lg border border-zinc-300 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <ProductModal
              isOpen={isModalOpen}
              close={modalClose}
              createProduct={createProduct}
              newName={newName}
              setNewName={setNewName}
              newStyle={newStyle}
              setNewStyle={setNewStyle}
              newPrice={newPrice}
              setNewPrice={setNewPrice}
              newInputCost={newInputCost}
              setNewInputCost={setNewInputCost}
              newSku={newSku}
              setNewSku={setNewSku}
              newDescription={newDescription}
              setNewDescription={setNewDescription}
              newCategories={newCategories}
              setNewCategories={setNewCategories}
              newVendors={newVendors}
              setNewVendors={setNewVendors}
              newStock={newStock}
              setNewStock={setNewStock}
              images={images}
              setImages={setImages}
              handleFiles={handleFiles}
              handleDrop={handleDrop}
              handleDragOver={handleDragOver}
            />

            <div className="flex justify-end mb-4">
              <ColumnDropdown options={allColumns} selected={visibleColumns} setSelected={setVisibleColumns} />
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
                            className={`px-6 py-4 ${col === "Price" || col === "Stock" || col === "Cost" ? "text-right" : "text-left"}`}
                          >
                            {col}
                          </th>
                        ) : null
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200 dark:divide-zinc-700">
                    {filteredProducts.length === 0 ? (
                      <tr>
                        <td colSpan={allColumns.length} className="px-6 py-12 text-center text-zinc-500 dark:text-zinc-400">
                          No products found.
                        </td>
                      </tr>
                    ) : (
                      filteredProducts.map((p) => (
                        <ProductTableRow
                          key={p.id}
                          product={p}
                          visibleColumns={visibleColumns}
                          editProduct={editProduct}
                          duplicateProduct={duplicateProduct}
                          deleteProduct={deleteProduct}
                          orderMore={() => orderMore(p)}
                          setNonTaxable={setNonTaxable}
                          archiveProduct={archiveProduct}
                          updateLowStockAlert={updateLowStockAlert}
                          rowClassName="py-6"
                        />
                      ))
                    )}
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