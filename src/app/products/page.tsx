"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import Sidebar from "@/components/sidebar";
import { api } from "@/lib/api";
import ColumnDropdown from "@/components/ColumnDropdown";
import ProductModal from "@/components/ProductModal";
import QuickCreateProduct from "@/components/QuickCreateProduct";
import ProductTableRow, { Product } from "@/components/ProductTableRow";
import { useAlerts } from "@/lib/AlertsContext";

// OrderMore modal component
function OrderMoreModal({
  isOpen,
  close,
  product,
  onSubmit,
}: {
  isOpen: boolean;
  close: () => void;
  product: Product | null;
  onSubmit: (productId: string, count: number) => void;
}) {
  const [count, setCount] = useState(0);

  if (!isOpen || !product) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (count <= 0) return alert("Enter a valid count.");
    onSubmit(product.id, count);
    setCount(0);
    close();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl shadow-lg w-96">
        <h2 className="text-xl font-semibold mb-4 dark:text-white">Order More: {product.name}</h2>
        {product.description && <p className="mb-2 dark:text-zinc-300">{product.description}</p>}
        {product.vendors && product.vendors.length > 0 && (
          <p className="mb-2 dark:text-zinc-300">Vendor: {product.vendors.join(", ")}</p>
        )}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            type="number"
            min={1}
            value={count}
            onChange={(e) => setCount(Number(e.target.value))}
            placeholder="Number of items to order"
            className="px-4 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
          />
          <div className="flex justify-end gap-2">
            <button type="button" onClick={close} className="px-4 py-2 rounded bg-zinc-400 hover:bg-zinc-500 text-white">
              Cancel
            </button>
            <button type="submit" className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white">
              Submit
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
  const [newPrice, setNewPrice] = useState("");
  const [newSku, setNewSku] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newCategories, setNewCategories] = useState("");
  const [newVendors, setNewVendors] = useState<string[]>([]);
  const [newStock, setNewStock] = useState("0");
  const [images, setImages] = useState<File[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [orderModalProduct, setOrderModalProduct] = useState<Product | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const allColumns = ["Item", "SKU", "Price", "Categories", "Stock", "Vendors", "Actions"];
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
      formData.append("price", product.price.toString());
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
      formData.append("price", updatedProduct.price.toString());
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

  // Open OrderMore modal
  const orderMore = (product: Product) => setOrderModalProduct(product);
  const closeOrderModal = () => setOrderModalProduct(null);

  // Submit OrderMore to database
  const handleOrderMoreSubmit = async (productId: string, count: number) => {
    const product = products.find((p) => p.id === productId);
    if (!product) return;

    try {
      const orderData = {
        productId: product.id,
        name: product.name,
        description: product.description,
        vendors: product.vendors,
        count,
      };

      const res = await fetch("http://localhost:4000/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orderData),
      });

      if (!res.ok) throw new Error("Failed to record order");

      alert(`Successfully added ${count} units of ${product.name} to orders database.`);
    } catch (err) {
      console.error(err);
      alert("Failed to record order.");
    }
  };

  const setNonTaxable = (id: string) => console.log("Set non-taxable", id);
  const archiveProduct = async (id: string) => {
  const product = products.find((p) => p.id === id);
  if (!product) return alert("Product not found");

  try {
    // Convert id to number
    const numericId = Number(id);

    // 1️⃣ Archive first
    const archiveRes = await fetch("http://localhost:4000/api/archives", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        entity: "Product",
        entityId: numericId, // <-- must be a number
        data: product,
      }),
    });

    if (!archiveRes.ok) throw new Error("Failed to archive product");

    // 2️⃣ Delete product (soft delete)
    const deleteRes = await fetch(`http://localhost:4000/api/products/${numericId}`, {
      method: "DELETE",
    });
    if (!deleteRes.ok) throw new Error("Failed to delete product");

    // 3️⃣ Update local state
    setProducts((prev) => prev.filter((p) => p.id !== id));

    alert(`Product "${product.name}" archived successfully.`);
  } catch (err) {
    console.error(err);
    alert("Failed to archive product.");
  }
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
    if (!newName.trim() || !newPrice.trim()) return alert("Name and Price are required.");

    const formData = new FormData();
    formData.append("name", newName.trim());
    formData.append("price", newPrice.trim());
    if (newSku.trim()) formData.append("sku", newSku.trim());
    if (newDescription.trim()) formData.append("description", newDescription.trim());
    if (newCategories.trim()) formData.append("categories", newCategories.trim());
    if (newStock.trim()) formData.append("stock", newStock.trim());
    if (newVendors.length > 0) formData.append("vendors", newVendors.join(","));
    images.forEach((img) => formData.append("images", img));

    try {
      const res = await fetch("http://localhost:4000/api/products", { method: "POST", body: formData });
      if (!res.ok) throw new Error("Failed to create product");
      const newProduct: Product = await res.json();
      newProduct.id = String(newProduct.id);
      setProducts((prev) => [...prev, newProduct]);

      setNewName("");
      setNewPrice("");
      setNewSku("");
      setNewDescription("");
      setNewCategories("");
      setNewStock("0");
      setNewVendors([]);
      setImages([]);
      modalClose();
    } catch (err) {
      console.error(err);
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
              newPrice={newPrice}
              setNewPrice={setNewPrice}
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

            <QuickCreateProduct
              newName={newName}
              setNewName={setNewName}
              newPrice={newPrice}
              setNewPrice={setNewPrice}
              createProduct={createProduct}
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
                            className={`px-6 py-4 ${
                              col === "Price" || col === "Stock" ? "text-right" : "text-left"
                            }`}
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

            {/* OrderMore modal */}
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
