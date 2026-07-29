"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

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
  const [isOpen, setIsOpen] = useState(false);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  return (
    <>
      {/* Mobile Top Bar (Hidden on Desktop) */}
      <div className="md:hidden flex items-center justify-between p-4 bg-ink text-panel shrink-0 w-full z-40 relative">
        <div>
          <p className="font-display text-xl tracking-tight">Counter</p>
          <p className="text-xs text-panel/70">{adminName}</p>
        </div>
        <button
          onClick={() => setIsOpen(true)}
          className="p-2 -mr-2 text-panel/80 hover:text-panel transition"
        >
          {/* Hamburger Icon */}
          <svg
            className="w-7 h-7"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
        </button>
      </div>

      {/* Dark Backdrop for Mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 md:hidden transition-opacity"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar (Fixed sliding drawer on mobile, relative column on desktop) */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-ink text-panel flex flex-col min-h-screen transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="px-6 py-6 flex items-start justify-between">
          <div>
            <p className="font-display text-xl tracking-tight">Counter</p>
            <p className="text-muted text-xs mt-0.5">
              {role === "VIEWER" ? "Viewer" : "Admin"} · {adminName}
            </p>
          </div>
          {/* Close button for mobile */}
          <button
            onClick={() => setIsOpen(false)}
            className="md:hidden p-1 text-panel/60 hover:text-panel"
          >
            ✕
          </button>
        </div>

        <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
          {NAV.map((item) => {
            const isActive = item.exact
              ? pathname === item.href
              : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsOpen(false)} // Auto-close drawer when clicking a link
                className={`block px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-fire text-white"
                    : "text-panel/70 hover:bg-white/10"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="px-3 pb-6 pt-4">
          <button
            onClick={logout}
            className="w-full px-3 py-2.5 rounded-lg text-sm font-medium text-panel/60 hover:bg-white/10 text-left transition"
          >
            Log out
          </button>
        </div>
      </aside>
    </>
  );
}
