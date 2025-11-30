"use client";

import { Fragment, useState } from "react";
import { Menu, Transition } from "@headlessui/react";

export interface Variant {
  size: string;
  sku: string;
  price: number;
}
export interface Product {
  id: string;
  name: string;
  sku?: string;
  price: number;
  description?: string;
  categories?: string;
  vendors?: string[];
  stock?: number;
  images?: string[]; // <-- add this line
  variants?: Variant[]; // <-- add this line
}

interface ProductTableRowProps {
  product: Product;
  visibleColumns: Set<string>;
  editProduct: (updatedProduct: Product) => Promise<void>;
  duplicateProduct: (product: Product) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  orderMore: (id: string) => void;
  setNonTaxable: (id: string) => void;
  archiveProduct: (id: string) => void;
  updateLowStockAlert: (id: string) => void;
  rowClassName?: string;
}

export default function ProductTableRow({
  product,
  visibleColumns,
  editProduct,
  duplicateProduct,
  deleteProduct,
  orderMore,
  setNonTaxable,
  archiveProduct,
  updateLowStockAlert,
  rowClassName = "",
}: ProductTableRowProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedProduct, setEditedProduct] = useState<Product>({ ...product });

  const handleChange = (field: keyof Product, value: any) => {
    setEditedProduct((prev) => ({ ...prev, [field]: value }));
  };

  const saveChanges = () => {
    editProduct(editedProduct);
    setIsEditing(false);
  };

  const cancelEdit = () => {
    setEditedProduct({ ...product });
    setIsEditing(false);
  };

  return (
    <tr className={`hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors ${rowClassName}`}>
      {visibleColumns.has("Item") && (
        <td className="px-6 py-4 font-medium text-zinc-900 dark:text-zinc-100">
          {isEditing ? (
            <input
              type="text"
              value={editedProduct.name}
              onChange={(e) => handleChange("name", e.target.value)}
              className="border rounded px-2 py-1 w-full dark:bg-zinc-700 dark:text-white"
            />
          ) : (
            product.name
          )}

          {product.variants?.map((v) => (
            <div key={v.sku ?? `${product.id}-${v.size}`} className="text-sm text-zinc-500 dark:text-zinc-400">
              {v.size} - ${v.price}
            </div>
          ))}
        </td>
      )}

      {visibleColumns.has("SKU") && (
        <td className="px-6 py-4 text-zinc-700 dark:text-zinc-300">
          {isEditing ? (
            <input
              type="text"
              value={editedProduct.sku ?? ""}
              onChange={(e) => handleChange("sku", e.target.value)}
              className="border rounded px-2 py-1 w-full dark:bg-zinc-700 dark:text-white"
            />
          ) : (
            product.sku ?? "-"
          )}
        </td>
      )}

      {visibleColumns.has("Price") && (
        <td className="px-6 py-4 text-right text-zinc-800 dark:text-zinc-200">
          {isEditing ? (
            <input
              type="number"
              value={editedProduct.price}
              onChange={(e) => handleChange("price", Number(e.target.value))}
              className="border rounded px-2 py-1 w-full text-right dark:bg-zinc-700 dark:text-white"
            />
          ) : (
            `$${product.price}`
          )}
        </td>
      )}

      {visibleColumns.has("Categories") && (
        <td className="px-6 py-4 text-zinc-700 dark:text-zinc-300">
          {isEditing ? (
            <input
              type="text"
              value={editedProduct.categories ?? ""}
              onChange={(e) => handleChange("categories", e.target.value)}
              className="border rounded px-2 py-1 w-full dark:bg-zinc-700 dark:text-white"
            />
          ) : (
            product.categories ?? "-"
          )}
        </td>
      )}

      {visibleColumns.has("Stock") && (
        <td className="px-6 py-4 text-right text-zinc-800 dark:text-zinc-200">
          {isEditing ? (
            <input
              type="number"
              value={editedProduct.stock ?? 0}
              onChange={(e) => handleChange("stock", Number(e.target.value))}
              className="border rounded px-2 py-1 w-full text-right dark:bg-zinc-700 dark:text-white"
            />
          ) : (
            product.stock ?? 0
          )}
        </td>
      )}


      {visibleColumns.has("Vendors") && (
        <td className="px-6 py-4 text-zinc-700 dark:text-zinc-300">
          {isEditing ? (
            <input
              type="text"
              value={editedProduct.vendors?.join(", ") ?? ""}
              onChange={(e) =>
                handleChange("vendors", e.target.value.split(",").map((v) => v.trim()))
              }
              className="border rounded px-2 py-1 w-full dark:bg-zinc-700 dark:text-white"
            />
          ) : (
            product.vendors?.join(", ") ?? "-"
          )}
        </td>
      )}

      {visibleColumns.has("Actions") && (
        <td className="px-6 py-4 text-right">
          <Menu as="div" className="relative inline-block text-left">
            <Menu.Button className="text-blue-600 dark:text-blue-400 hover:underline">
              {isEditing ? "Editing" : "Actions"}
            </Menu.Button>

            <Transition
              as={Fragment}
              enter="transition ease-out duration-100"
              enterFrom="transform opacity-0 scale-95"
              enterTo="transform opacity-100 scale-100"
              leave="transition ease-in duration-75"
              leaveFrom="transform opacity-100 scale-100"
              leaveTo="transform opacity-0 scale-95"
            >
              <Menu.Items className="absolute right-0 mt-2 w-56 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 divide-y divide-zinc-100 dark:divide-zinc-700 rounded-md shadow-lg focus:outline-none z-50">
                <div className="px-1 py-1">
                  {isEditing ? (
                    <>
                      <Menu.Item>
                        {({ active }) => (
                          <button
                            className={`${
                              active ? "bg-gray-100 dark:bg-zinc-700" : ""
                            } group flex w-full items-center px-2 py-2 text-sm text-green-600`}
                            onClick={saveChanges}
                          >
                            Save
                          </button>
                        )}
                      </Menu.Item>
                      <Menu.Item>
                        {({ active }) => (
                          <button
                            className={`${
                              active ? "bg-gray-100 dark:bg-zinc-700" : ""
                            } group flex w-full items-center px-2 py-2 text-sm text-gray-600`}
                            onClick={cancelEdit}
                          >
                            Cancel
                          </button>
                        )}
                      </Menu.Item>
                    </>
                  ) : (
                    <>
                      <Menu.Item>
                        {({ active }) => (
                          <button
                            className={`${
                              active ? "bg-gray-100 dark:bg-zinc-700" : ""
                            } group flex w-full items-center px-2 py-2 text-sm`}
                            onClick={() => setIsEditing(true)}
                          >
                            Edit
                          </button>
                        )}
                      </Menu.Item>
                      <Menu.Item>
                        {({ active }) => (
                          <button
                            className={`${
                              active ? "bg-gray-100 dark:bg-zinc-700" : ""
                            } group flex w-full items-center px-2 py-2 text-sm`}
                            onClick={() => duplicateProduct(product)}
                          >
                            Duplicate
                          </button>
                        )}
                      </Menu.Item>
                      <Menu.Item>
                        {({ active }) => (
                          <button
                            className={`${
                              active ? "bg-gray-100 dark:bg-zinc-700" : ""
                            } group flex w-full items-center px-2 py-2 text-sm`}
                            onClick={() => orderMore(product.id)}
                          >
                            Order More
                          </button>
                        )}
                      </Menu.Item>
                      <Menu.Item>
                        {({ active }) => (
                          <button
                            className={`${
                              active ? "bg-gray-100 dark:bg-zinc-700" : ""
                            } group flex w-full items-center px-2 py-2 text-sm`}
                            onClick={() => setNonTaxable(product.id)}
                          >
                            Set as Non-Taxable
                          </button>
                        )}
                      </Menu.Item>
                      <Menu.Item>
                        {({ active }) => (
                          <button
                            className={`${
                              active ? "bg-gray-100 dark:bg-zinc-700" : ""
                            } group flex w-full items-center px-2 py-2 text-sm`}
                            onClick={() => archiveProduct(product.id)}
                          >
                            Archive
                          </button>
                        )}
                      </Menu.Item>
                      <Menu.Item>
                        {({ active }) => (
                          <button
                            className={`${
                              active ? "bg-gray-100 dark:bg-zinc-700" : ""
                            } group flex w-full items-center px-2 py-2 text-sm`}
                            onClick={() => updateLowStockAlert(product.id)}
                          >
                            Update Low Stock Alert
                          </button>
                        )}
                      </Menu.Item>
                      <Menu.Item>
                        {({ active }) => (
                          <button
                            className={`${
                              active
                                ? "bg-gray-100 dark:bg-zinc-700 text-red-600"
                                : "text-red-500"
                            } group flex w-full items-center px-2 py-2 text-sm`}
                            onClick={() => deleteProduct(product.id)}
                          >
                            Delete
                          </button>
                        )}
                      </Menu.Item>
                    </>
                  )}
                </div>
              </Menu.Items>
            </Transition>
          </Menu>
        </td>
      )}
    </tr>
  );
}
