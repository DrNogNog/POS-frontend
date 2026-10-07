"use client";
// -----------------------------------------------------------------------------
// The frame around every screen: walnut sidebar with the logo and menu,
// a top bar with the store switcher, and the login check.
// -----------------------------------------------------------------------------
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import {
  BarChart3,
  BookOpen,
  Boxes,
  ClipboardCheck,
  ClipboardList,
  FileText,
  History,
  Home,
  Landmark,
  LogOut,
  Menu,
  Receipt,
  ScanBarcode,
  Settings,
  ShoppingCart,
  Truck,
  Users,
  Wallet,
  Calculator,
  Factory,
  Archive,
  Eye,
  EyeOff,
  PanelLeftClose,
  PanelLeftOpen,
  type LucideIcon,
} from "lucide-react";
import { useSession } from "@/lib/session";
import { usePriceLevels } from "@/lib/privacy";
import { cn } from "@/lib/utils";
import Screensaver from "./Screensaver";
import type { Role } from "@/lib/types";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  roles?: Role[]; // who can see it (OWNER always can)
}

const NAV: { group: string; items: NavItem[] }[] = [
  { group: "", items: [{ href: "/", label: "Dashboard", icon: Home }] },
  {
    group: "Sales",
    items: [
      { href: "/sell", label: "New sale or estimate", icon: ShoppingCart },
      { href: "/estimates", label: "Estimates", icon: ClipboardList },
      { href: "/approvals", label: "Approvals", icon: ClipboardCheck },
      { href: "/invoices", label: "Invoices", icon: FileText },
      { href: "/customers", label: "Customers", icon: Users },
    ],
  },
  {
    group: "Receivables",
    items: [{ href: "/accounts-receivable", label: "Accounts receivable", icon: Wallet, roles: ["MANAGER", "ACCOUNTANT"] }],
  },
  {
    group: "Purchasing",
    items: [
      { href: "/purchase-orders", label: "Purchase orders", icon: Truck, roles: ["MANAGER", "ACCOUNTANT"] },
      { href: "/billing-orders", label: "Billing orders", icon: Receipt, roles: ["MANAGER", "ACCOUNTANT"] },
      { href: "/suppliers", label: "Suppliers", icon: Factory },
    ],
  },
  {
    group: "Payables",
    items: [{ href: "/accounts-payable", label: "Accounts payable", icon: Landmark, roles: ["MANAGER", "ACCOUNTANT"] }],
  },
  {
    group: "Inventory",
    items: [
      { href: "/products", label: "Items & stock", icon: Boxes },
      { href: "/item-codes", label: "Cabinet code guide", icon: ScanBarcode },
      { href: "/costing", label: "Costing & averages", icon: Calculator, roles: ["MANAGER", "ACCOUNTANT"] },
      { href: "/archives", label: "Archived items", icon: Archive, roles: ["MANAGER"] },
    ],
  },
  {
    group: "Office",
    items: [
      { href: "/reports", label: "Reports", icon: BarChart3, roles: ["MANAGER", "ACCOUNTANT"] },
      { href: "/payroll", label: "Payroll", icon: BookOpen, roles: ["MANAGER", "ACCOUNTANT"] },
      { href: "/history", label: "History", icon: History },
      { href: "/settings", label: "Settings", icon: Settings, roles: ["MANAGER"] },
    ],
  },
];

/** The store's own logo (public/Invoice Logo.png) — the same one printed on documents. */
function StoreLogo() {
  const { store, settings } = useSession();
  const name = settings?.settings.name || store?.name || "Store";
  return (
    <Image
      src="/Invoice%20Logo.png"
      alt={name}
      title={name}
      width={209}
      height={45}
      className="h-9 w-auto rounded-[0.25rem]"
      priority
    />
  );
}

const NAV_KEY = "pos.navHidden";

export default function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, store, settings, loading, logout, can } = useSession();
  const [menuOpen, setMenuOpen] = useState(false); // phone / tablet slide-out
  const [navHidden, setNavHidden] = useState(false); // desktop: hide the menu entirely
  const levels = usePriceLevels();
  const isLogin = pathname.startsWith("/login");

  useEffect(() => {
    if (!loading && !user && !isLogin) router.replace("/login");
  }, [loading, user, isLogin, router]);

  useEffect(() => setMenuOpen(false), [pathname]);

  useEffect(() => {
    try {
      setNavHidden(window.localStorage.getItem(NAV_KEY) === "1");
    } catch {
      /* ignore */
    }
  }, []);
  const toggleNav = () => {
    setNavHidden((h) => {
      try {
        window.localStorage.setItem(NAV_KEY, h ? "0" : "1");
      } catch {
        /* ignore */
      }
      return !h;
    });
  };

  if (isLogin) return <>{children}</>;
  if (loading || !user) {
    return <div className="flex min-h-screen items-center justify-center text-oak">Loading…</div>;
  }

  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <div className="flex min-h-screen">
      <aside
        aria-label="Navigation"
        className={cn(
          "fixed inset-y-3 left-3 z-40 w-68 overflow-y-auto rounded-lux bg-walnut text-ivory shadow-2xl transition-transform",
          "lg:sticky lg:top-3 lg:h-[calc(100vh-1.5rem)] lg:shrink-0 lg:translate-x-0",
          menuOpen ? "translate-x-0" : "-translate-x-[110%]",
          navHidden && "lg:hidden"
        )}
      >
        <div className="px-4 pb-2 pt-4">
          <Link href="/" className="block overflow-hidden rounded-lux bg-white/95">
            <Image src="/Champion.png" alt="Champion Point of Sale" width={448} height={381} className="h-auto w-full" priority />
          </Link>
        </div>
        <nav className="px-3 pb-6" aria-label="Main menu">
          {NAV.map((g) => {
            const items = g.items.filter((i) => !i.roles || can(...i.roles));
            if (!items.length) return null;
            return (
              <div key={g.group || "home"} className="mb-2">
                {g.group && <div className="px-3 pb-1 pt-4 font-display text-lg italic text-maple">{g.group}</div>}
                {items.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-lux px-3 py-2.5 text-[15px] text-ivory/80 hover:bg-walnut-deep hover:text-ivory",
                      isActive(item.href) && "bg-ivory font-semibold text-walnut hover:bg-ivory hover:text-walnut"
                    )}
                  >
                    <item.icon size={18} aria-hidden />
                    {item.label}
                  </Link>
                ))}
              </div>
            );
          })}
        </nav>
      </aside>
      {menuOpen && <div className="fixed inset-0 z-30 bg-black/30 lg:hidden" onClick={() => setMenuOpen(false)} />}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-3 z-20 mx-3 mt-3 flex h-16 items-center justify-between gap-3 rounded-lux border border-hairline bg-white/90 px-3 shadow-sm backdrop-blur lg:mx-6">
          <div className="flex items-center gap-2">
            <button className="rounded-full p-2.5 text-walnut hover:bg-linen lg:hidden" aria-label="Open menu" onClick={() => setMenuOpen(true)}>
              <Menu size={20} />
            </button>
            <button
              className="hidden items-center gap-2 rounded-lux px-4 py-2 text-sm font-semibold text-walnut hover:bg-linen lg:inline-flex"
              onClick={toggleNav}
              aria-pressed={navHidden}
              title={navHidden ? "Show the menu" : "Hide the menu for more room"}
            >
              {navHidden ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
              {navHidden ? "Show menu" : "Hide menu"}
            </button>
            <StoreLogo />
          </div>
          <div className="flex items-center gap-2 text-sm">
            <button
              onClick={levels.toggle}
              aria-pressed={levels.show}
              title={levels.show ? "Price levels are showing — click to hide them" : "Price levels are hidden — click to show them"}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lux border px-4 py-2 font-semibold",
                levels.show ? "border-walnut bg-walnut text-ivory" : "border-hairline text-walnut hover:bg-linen"
              )}
            >
              {levels.show ? <Eye size={16} /> : <EyeOff size={16} />}
              Price levels
            </button>
            <span className="hidden px-2 text-oak xl:inline">
              {user.name} <span className="text-oak/70">({user.role.toLowerCase()})</span>
            </span>
            <button onClick={logout} className="inline-flex items-center gap-1.5 rounded-lux px-4 py-2 font-semibold text-walnut hover:bg-linen">
              <LogOut size={16} /> <span className="hidden sm:inline">Log out</span>
            </button>
          </div>
        </header>
        <main className="flex-1 px-4 py-8 lg:px-10">{children}</main>
      </div>
      <Screensaver storeName={settings?.settings.name || store?.name || ""} />
    </div>
  );
}
