"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";

export default function Sidebar() {
  const pathname = usePathname();

  const menus = [
    {
      key: "items",
      title: "Items & Services",
      links: [
        { name: "Item Library", href: "/products" },
        { name: "Image Library", href: "/image-library" },
        { name: "Categories", href: "/categories" },
        { name: "Stock Overview", href: "/stock-overview" },
        { name: "History", href: "/history" },
        { name: "Stock Counts", href: "/stock-counts" },
        { name: "Purchase Orders", href: "/purchase-orders" },
        { name: "Vendors", href: "/vendors" },
        { name: "Pending Restocks", href: "/pending-restocks" },
      ],
    },
    {
      key: "invoices",
      title: "Invoices",
      links: [
        { name: "Estimates", href: "/estimates" },
        { name: "Approvals", href: "/approvals" },
        { name: "Invoices", href: "/invoices" },
        { name: "Reports", href: "/reports" },
        { name: "Apps", href: "/apps" },
      ],
    },
  ];

  // Auto-open the menu that contains the current route
  const defaultOpenMenu = menus.find((menu) =>
    menu.links.some((link) => link.href === pathname)
  )?.key;

  const [openMenu, setOpenMenu] = useState<string | null>(defaultOpenMenu || null);

  // Highlight active link
  const isActive = (href: string) => pathname === href ? "bg-zinc-300 dark:bg-zinc-700" : "";

  // Toggle menu open/close
  const toggleMenu = (key: string) => {
    setOpenMenu(openMenu === key ? null : key);
  };

  return (
    <aside className="w-64 bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800 p-4 space-y-4">
      {/* Logo */}
      <div className="flex justify-center mb-4">
        <Image src="/Champion.png" alt="Champion Logo" width={140} height={60} />
      </div>

      {/* Home */}
      <Link
        href="/"
        className={`w-full block rounded-xl border border-zinc-200 dark:border-zinc-700 p-3 font-semibold
        dark:text-white hover:bg-zinc-200 dark:hover:bg-zinc-700 ${isActive("/")}`}
      >
        🏠 Home
      </Link>

      {/* Menu Sections */}
      {menus.map((menu) => (
        <div
          key={menu.key}
          className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 p-3 shadow-sm"
        >
          <button
            onClick={() => toggleMenu(menu.key)}
            className="w-full flex justify-between items-center font-semibold dark:text-white"
          >
            <span>{menu.title}</span>
            <span>{openMenu === menu.key ? "▲" : "▼"}</span>
          </button>

          <div
            className={`mt-3 pl-2 flex flex-col gap-2 text-sm transition-all duration-200 overflow-hidden ${
              openMenu === menu.key ? "max-h-96" : "max-h-0"
            }`}
          >
            {menu.links.map((link) => (
              <Link
                key={link.name}
                href={link.href}
                className={`text-left rounded-md px-2 py-1 hover:bg-zinc-200 dark:hover:bg-zinc-700 dark:text-zinc-300 ${isActive(
                  link.href
                )}`}
              >
                {link.name}
              </Link>
            ))}
          </div>
        </div>
      ))}
    </aside>
  );
}
