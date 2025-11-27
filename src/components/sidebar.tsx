"use client";

import Image from "next/image";
import { useState } from "react";

interface SidebarProps {
  onSelectPage: (page: string) => void;
  activePage: string;
}

export default function Sidebar({ onSelectPage, activePage }: SidebarProps) {
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  const menus = [
    {
      key: "items",
      title: "Items & Services",
      links: [
        "Item Library",
        "Image Library",
        "Categories",
        "Stock Overview",
        "History",
        "Stock Counts",
        "Purchase Orders",
        "Vendors",
        "Pending Restocks",
        "Gift Cards",
        "Subscription Plans",
      ],
    },
    {
      key: "orders",
      title: "Orders",
      links: ["All Orders", "Shipments", "Order Partners", "Fulfillment Settings"],
    },
    {
      key: "invoices",
      title: "Invoices",
      links: ["Overview", "Projects", "Invoices", "Recurring Series", "Estimates", "Reports", "Apps"],
    },
    {
      key: "sales",
      title: "Sales Summary",
      links: ["Item Sales", "Sales Trends", "Category Sales", "Gift Cards", "Inventory Sell-through Rates"],
    },
  ];

  const isActive = (item: string) =>
    activePage === item ? "bg-zinc-300 dark:bg-zinc-700" : "";

  return (
    <aside className="w-64 bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800 p-4 space-y-4">
      {/* Logo */}
      <div className="flex justify-center mb-4">
        <Image src="/Champion.png" alt="Champion Logo" width={140} height={60} />
      </div>

      {/* Home */}
      <button
        className={`w-full block rounded-xl border border-zinc-200 dark:border-zinc-700 p-3 font-semibold
        dark:text-white hover:bg-zinc-200 dark:hover:bg-zinc-700 ${isActive("home")}`}
        onClick={() => onSelectPage("home")}
      >
        🏠 Home
      </button>

      {/* Menus */}
      {menus.map((menu) => (
        <div key={menu.key} className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 p-3 shadow-sm">
          <button
            onClick={() => setOpenMenu(openMenu === menu.key ? null : menu.key)}
            className="w-full flex justify-between items-center font-semibold dark:text-white"
          >
            <span>{menu.title}</span>
            <span>{openMenu === menu.key ? "▲" : "▼"}</span>
          </button>

          {openMenu === menu.key && (
            <div className="mt-3 pl-2 flex flex-col gap-2 text-sm">
              {menu.links.map((item) => (
                <button
                  key={item}
                  className={`text-left rounded-md px-2 py-1 hover:bg-zinc-200 dark:hover:bg-zinc-700 dark:text-zinc-300 ${isActive(item)}`}
                  onClick={() => onSelectPage(item)}
                >
                  {item}
                </button>
              ))}
            </div>
          )}
        </div>
      ))}
    </aside>
  );
}
