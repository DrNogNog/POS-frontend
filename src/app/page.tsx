"use client";

import Link from "next/link";
import Sidebar from "@/components/sidebar";

export default function HomePage() {
  return (
    <div className="flex min-h-screen bg-zinc-100 dark:bg-black">
      <Sidebar />

      <main className="flex-1 p-10 overflow-auto">
        <div className="w-full max-w-md rounded-2xl bg-white dark:bg-zinc-900 p-10 shadow-xl mx-auto">
          <h1 className="text-3xl font-bold mb-6 text-center dark:text-white">
            POS System
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400 text-center mb-10">
            Manage products, sales, and inventory.
          </p>
          <div className="flex flex-col gap-4">
            <Link
              href="/products"
              className="w-full rounded-lg border p-3 text-center hover:bg-zinc-100 dark:text-white dark:border-zinc-700 dark:hover:bg-zinc-800"
            >
              View Products
            </Link>
            <Link
              href="/register"
              className="w-full rounded-lg border p-3 text-center hover:bg-zinc-100 dark:text-white dark:border-zinc-700 dark:hover:bg-zinc-800"
            >
              Cashier Register
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
