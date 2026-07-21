"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const NAV = [
  { href: "/admin", label: "Overview", exact: true },
  { href: "/orders", label: "Order History" },
  { href: "/admin/cashiers", label: "Cashiers" },
  { href: "/admin/stock", label: "Stock & Ingredients" },
  { href: "/admin/products", label: "Products & Recipes" },
  { href: "/admin/finances", label: "Finances" },
  { href: "/admin/performance", label: "Cashier Performance" },
  { href: "/admin/reviews", label: "Reviews" },
  { href: "/admin/settings", label: "Settings" },
];

export default function Sidebar({
  adminName,
  role,
}: {
  adminName: string;
  role?: "ADMIN" | "VIEWER";
}) {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  return (
    <aside className="w-64 shrink-0 bg-ink text-panel flex flex-col min-h-screen">
      <div className="px-6 py-6">
        <p className="font-display text-xl tracking-tight">Counter</p>
        <p className="text-muted text-xs mt-0.5">
          {role === "VIEWER" ? "Viewer" : "Admin"} · {adminName}
        </p>
      </div>
      <nav className="flex-1 px-3 space-y-1">
        {NAV.map((item) => {
          const isActive = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`block px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive ? "bg-fire text-white" : "text-panel/70 hover:bg-white/5"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="px-3 pb-6">
        <button
          onClick={logout}
          className="w-full px-3 py-2.5 rounded-lg text-sm font-medium text-panel/60 hover:bg-white/5 text-left"
        >
          Log out
        </button>
      </div>
    </aside>
  );
}
