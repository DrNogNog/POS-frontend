import { Fragment } from "react";
import { Menu, Transition } from "@headlessui/react";

interface Variant {
  size: string;
  sku: string;
  price: number;
}

interface Product {
  id: string;
  name: string;
  sku?: string | null;
  price: number;
  description?: string | null;
  variants?: Variant[];
}

interface ProductTableRowProps {
  product: Product;
  visibleColumns: Set<string>;
  editProduct: (id: string) => void;
  duplicateProduct: (product: Product) => void;
  deleteProduct: (id: string) => void;
  orderMore: (id: string) => void;
  setNonTaxable: (id: string) => void;
  archiveProduct: (id: string) => void;
  updateLowStockAlert: (id: string) => void;
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
}: ProductTableRowProps) {
  return (
    <tr className="hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">
      {visibleColumns.has("Item") && (
        <td className="px-6 py-4 font-medium text-zinc-900 dark:text-zinc-100">
          {product.name}
          {/* Example of nested map with proper keys */}
          {product.variants?.map((v) => (
            <div key={v.sku ?? `${product.id}-${v.size}`}>
              {v.size} - ${v.price}
            </div>
          ))}
        </td>
      )}

      {visibleColumns.has("SKU") && (
        <td className="px-6 py-4 text-zinc-700 dark:text-zinc-300">
          {product.sku ?? "-"}
        </td>
      )}

      {visibleColumns.has("Price") && (
        <td className="px-6 py-4 text-right text-zinc-800 dark:text-zinc-200">
          ${product.price}
        </td>
      )}

      {visibleColumns.has("Actions") && (
        <td className="px-6 py-4 text-right">
          <Menu as="div" className="relative inline-block text-left">
            <Menu.Button className="text-blue-600 dark:text-blue-400 hover:underline">
              Edit
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
                  <Menu.Item>
                    {({ active }) => (
                      <button
                        key="edit"
                        className={`${active ? "bg-gray-100 dark:bg-zinc-700" : ""} group flex w-full items-center px-2 py-2 text-sm`}
                        onClick={() => editProduct(product.id)}
                      >
                        Edit
                      </button>
                    )}
                  </Menu.Item>
                  <Menu.Item>
                    {({ active }) => (
                      <button
                        key="duplicate"
                        className={`${active ? "bg-gray-100 dark:bg-zinc-700" : ""} group flex w-full items-center px-2 py-2 text-sm`}
                        onClick={() => duplicateProduct(product)}
                      >
                        Duplicate
                      </button>
                    )}
                  </Menu.Item>
                  <Menu.Item>
                    {({ active }) => (
                      <button
                        key="orderMore"
                        className={`${active ? "bg-gray-100 dark:bg-zinc-700" : ""} group flex w-full items-center px-2 py-2 text-sm`}
                        onClick={() => orderMore(product.id)}
                      >
                        Order More
                      </button>
                    )}
                  </Menu.Item>
                  <Menu.Item>
                    {({ active }) => (
                      <button
                        key="setNonTaxable"
                        className={`${active ? "bg-gray-100 dark:bg-zinc-700" : ""} group flex w-full items-center px-2 py-2 text-sm`}
                        onClick={() => setNonTaxable(product.id)}
                      >
                        Set as Non-Taxable
                      </button>
                    )}
                  </Menu.Item>
                  <Menu.Item>
                    {({ active }) => (
                      <button
                        key="archive"
                        className={`${active ? "bg-gray-100 dark:bg-zinc-700" : ""} group flex w-full items-center px-2 py-2 text-sm`}
                        onClick={() => archiveProduct(product.id)}
                      >
                        Archive
                      </button>
                    )}
                  </Menu.Item>
                  <Menu.Item>
                    {({ active }) => (
                      <button
                        key="updateLowStockAlert"
                        className={`${active ? "bg-gray-100 dark:bg-zinc-700" : ""} group flex w-full items-center px-2 py-2 text-sm`}
                        onClick={() => updateLowStockAlert(product.id)}
                      >
                        Update Low Stock Alert
                      </button>
                    )}
                  </Menu.Item>
                  <Menu.Item>
                    {({ active }) => (
                      <button
                        key="delete"
                        className={`${active ? "bg-gray-100 dark:bg-zinc-700 text-red-600" : "text-red-500"} group flex w-full items-center px-2 py-2 text-sm`}
                        onClick={() => deleteProduct(product.id)}
                      >
                        Delete
                      </button>
                    )}
                  </Menu.Item>
                </div>
              </Menu.Items>
            </Transition>
          </Menu>
        </td>
      )}
    </tr>
  );
}
