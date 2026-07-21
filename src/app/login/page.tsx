"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function submit(nextPin: string) {
    if (nextPin.length < 4) return;
    setLoading(true);
    setError("");
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin: nextPin }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "Login failed");
      setPin("");
      return;
    }
    router.push(data.cashier.role === "CASHIER" ? "/pos" : "/admin");
  }

  function press(digit: string) {
    if (loading) return;
    const next = (pin + digit).slice(0, 6);
    setPin(next);
    setError("");
  }

  function backspace() {
    setPin((p) => p.slice(0, -1));
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface px-6 relative overflow-hidden">
      {/* Subtle branded backdrop */}
      <div
        className="absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, #F6F2EC 1.5px, transparent 1.5px)",
          backgroundSize: "28px 28px",
        }}
      />
      <div
        className="absolute -top-40 -right-40 w-96 h-96 rounded-full opacity-20 blur-3xl"
        style={{ background: "#FF5A36" }}
      />

      <div className="relative w-full max-w-sm">
        <div className="flex flex-col items-center mb-10">
          <div className="w-16 h-16 rounded-2xl bg-fire flex items-center justify-center mb-4 shadow-lg shadow-fire/20">
            <span className="font-display text-3xl text-white">C</span>
          </div>
          <p className="font-display text-3xl text-panel tracking-tight">Counter</p>
          <p className="text-muted text-sm mt-1">Enter your staff PIN to continue</p>
        </div>

        <div className="bg-white/[0.04] border border-white/10 rounded-3xl p-8 backdrop-blur-sm">
          <div className="flex justify-center gap-3 mb-8">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className={`w-3.5 h-3.5 rounded-full border-2 border-fire transition-colors ${
                  i < pin.length ? "bg-fire" : "bg-transparent"
                }`}
              />
            ))}
          </div>

          {error && (
            <p className="text-fire text-center mb-5 text-sm font-medium" role="alert">
              {error}
            </p>
          )}

          <div className="grid grid-cols-3 gap-3">
            {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
              <button
                key={d}
                onClick={() => press(d)}
                className="aspect-square rounded-2xl bg-white/5 text-panel text-2xl font-display border border-white/5 active:bg-fire active:border-fire transition-colors"
              >
                {d}
              </button>
            ))}
            <button
              onClick={backspace}
              className="aspect-square rounded-2xl bg-white/[0.03] text-muted text-sm font-medium active:bg-white/10 transition-colors"
            >
              Del
            </button>
            <button
              onClick={() => press("0")}
              className="aspect-square rounded-2xl bg-white/5 text-panel text-2xl font-display border border-white/5 active:bg-fire active:border-fire transition-colors"
            >
              0
            </button>
            <button
              onClick={() => submit(pin)}
              disabled={pin.length < 4 || loading}
              className="aspect-square rounded-2xl bg-fire text-white text-base font-semibold disabled:opacity-30 active:bg-fire-dark transition-colors"
            >
              {loading ? "…" : "Go"}
            </button>
          </div>
        </div>

        <p className="text-center text-muted text-xs mt-6">
          Cashiers, admins, and viewers all sign in here — access is based on your PIN.
        </p>
      </div>
    </div>
  );
}
