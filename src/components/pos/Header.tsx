"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function Header({
  cashierName,
  businessDayLabel,
}: {
  cashierName: string;
  businessDayLabel: string | null;
}) {
  const [time, setTime] = useState("");
  const router = useRouter();

  useEffect(() => {
    const tick = () =>
      setTime(
        new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      );
    tick();
    const id = setInterval(tick, 15000);
    return () => clearInterval(id);
  }, []);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  return (
    <header className="flex items-center justify-between px-6 py-4 bg-ink text-panel">
      <div className="flex items-baseline gap-3">
        <span className="font-display text-xl tracking-tight">Counter</span>
        <span className="text-muted text-sm">/ {cashierName}</span>
        {businessDayLabel ? (
          <span className="text-xs px-2.5 py-1 rounded-full bg-success/10 text-success">
            {businessDayLabel}
          </span>
        ) : (
          <span className="text-xs px-2.5 py-1 rounded-full bg-warning/10 text-warning">
            No day open
          </span>
        )}
      </div>
      <div className="flex items-center gap-4">
        <Link href="/orders" className="text-sm text-panel/70 hover:text-panel">
          Order History
        </Link>
        <span className="font-mono text-sm text-muted">{time}</span>
        <button
          onClick={logout}
          className="text-sm px-4 py-2 rounded-full border border-muted/40 active:bg-fire active:border-fire transition-colors"
        >
          Clock out
        </button>
      </div>
    </header>
  );
}
