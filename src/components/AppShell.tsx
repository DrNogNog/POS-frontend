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
  Store as StoreIcon,
  Truck,
  Users,
  Wallet,
  Calculator,
  Factory,
  Archive,
  Eye,
  EyeOff,
  type LucideIcon,
} from "lucide-react";
import { useSession } from "@/lib/session";
import { usePriceLevels } from "@/lib/privacy";
import { cn } from "@/lib/utils";
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

function StoreSwitcher() {
  const { store, stores, switchStore } = useSession();
  const [error, setError] = useState("");
  if (!store) return null;
  return (
    <div className="flex items-center gap-2">
      <StoreIcon size={18} className="text-oak" aria-hidden />
      <label className="sr-only" htmlFor="store-switch">Store</label>
      <select
        id="store-switch"
        value={store.id}
        onChange={async (e) => {
          setError("");
          try {
            await switchStore(e.target.value);
          } catch (err) {
            setError(err instanceof Error ? err.message : String(err));
          }
        }}
        className="h-9 rounded-md border border-hairline bg-white px-3 font-semibold text-walnut"
      >
        {stores.map((s) => (
          <option key={s.id} value={s.id}>
            Store {s.id} — {s.name}
          </option>
        ))}
      </select>
      {error && <span className="text-sm text-late">{error}</span>}
    </div>
  );
}

export default function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading, logout, can } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);
  const levels = usePriceLevels();
  const isLogin = pathname.startsWith("/login");

  useEffect(() => {
    if (!loading && !user && !isLogin) router.replace("/login");
  }, [loading, user, isLogin, router]);

  useEffect(() => setMenuOpen(false), [pathname]);

  if (isLogin) return <>{children}</>;
  if (loading || !user) {
    return <div className="flex min-h-screen items-center justify-center text-oak">Loading…</div>;
  }

  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <div className="flex min-h-screen">
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-64 overflow-y-auto bg-walnut text-white transition-transform lg:static lg:translate-x-0",
          menuOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="p-4">
          <Link href="/" className="block overflow-hidden rounded-lg bg-white/95">
            <Image src="/Champion.png" alt="Champion Point of Sale" width={448} height={381} className="h-auto w-full" priority />
          </Link>
        </div>
        <nav className="px-3 pb-6" aria-label="Main menu">
          {NAV.map((g) => {
            const items = g.items.filter((i) => !i.roles || can(...i.roles));
            if (!items.length) return null;
            return (
              <div key={g.group || "home"} className="mb-3">
                {g.group && <div className="px-3 pb-1 pt-2 text-xs font-medium text-maple">{g.group}</div>}
                {items.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-md px-3 py-2 text-[15px] text-white/85 hover:bg-walnut-deep hover:text-white",
                      isActive(item.href) && "bg-walnut-deep font-semibold text-white shadow-[inset_3px_0_0_var(--color-maple)]"
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
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between gap-3 border-b border-hairline bg-white px-4 lg:px-8">
          <div className="flex items-center gap-3">
            <button className="rounded p-2 text-walnut hover:bg-linen lg:hidden" aria-label="Open menu" onClick={() => setMenuOpen(true)}>
              <Menu size={20} />
            </button>
            <StoreSwitcher />
          </div>
          <div className="flex items-center gap-3 text-sm">
            <button
              onClick={levels.toggle}
              aria-pressed={levels.show}
              title="Price levels, costs and margins — hide them when a customer can see the screen"
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 font-medium",
                levels.show ? "border-walnut bg-walnut text-white" : "border-hairline text-walnut hover:bg-linen"
              )}
            >
              {levels.show ? <EyeOff size={16} /> : <Eye size={16} />}
              {levels.show ? "Hide price levels" : "Show price levels"}
            </button>
            <span className="hidden text-oak sm:inline">
              {user.name} <span className="text-oak/70">({user.role.toLowerCase()})</span>
            </span>
            <button onClick={logout} className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-walnut hover:bg-linen">
              <LogOut size={16} /> Log out
            </button>
          </div>
        </header>
        <main className="flex-1 px-4 py-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
