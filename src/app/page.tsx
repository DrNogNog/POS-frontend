"use client";

import Link from "next/link";
import { useState } from "react";
import Sidebar from "@/components/sidebar";

export default function HomePage() {
  const [activePage, setActivePage] = useState("home");

  return (
    <div className="flex min-h-screen bg-zinc-100 dark:bg-black">

      {/* Reusable Sidebar */}
      <Sidebar
        onSelectPage={setActivePage}
        activePage={activePage}
      />

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-10">
        
        {/* HOME */}
        {activePage === "home" && (
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-zinc-900 p-10 shadow-xl">
            <h1 className="text-3xl font-bold mb-6 text-center dark:text-white">
              POS System
            </h1>

            <p className="text-zinc-600 dark:text-zinc-400 text-center mb-10">
              Manage products, sales, and inventory.
            </p>

            <div className="flex flex-col gap-4">
              <Link
                href="/products"
                className="w-full rounded-lg border border-zinc-300 p-3 text-center hover:bg-zinc-100 dark:text-white dark:border-zinc-700 dark:hover:bg-zinc-800"
              >
                View Products
              </Link>

              <Link
                href="/register"
                className="w-full rounded-lg border border-zinc-300 p-3 text-center hover:bg-zinc-100 dark:text-white dark:border-zinc-700 dark:hover:bg-zinc-800"
              >
                Cashier Register
              </Link>
            </div>
          </div>
        )}

        {/* NON-HOME CONTENT */}
        {activePage !== "home" && (
          <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-zinc-900 p-8 shadow-xl text-center">
            <h2 className="text-2xl font-bold mb-4 dark:text-white">
              {activePage}
            </h2>
            <p className="text-zinc-600 dark:text-zinc-400">
              This is placeholder content for <b>{activePage}</b>.
              Replace this with real content later.
            </p>
          </div>
        )}

      </main>
    </div>
  );
}
