"use client";

import { useEffect, useState } from "react";
import { useCanEdit } from "@/components/admin/RoleContext";

type BusinessDayData = {
  active: { id: string; label: string; startedAt: string; startedBy: string } | null;
  breakdown?: Record<string, number>;
  total?: number;
  orderCount?: number;
};

const METHOD_LABELS: Record<string, string> = {
  CASH: "Cash",
  VODAFONE_CASH: "Vodafone Cash",
  INSTAPAY: "Instapay",
  CREDIT_CARD: "Credit",
  TELDA: "Telda",
};

export default function BusinessDayCard() {
  const [data, setData] = useState<BusinessDayData | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const canEdit = useCanEdit();

  function load() {
    fetch("/api/admin/business-day")
      .then((r) => r.json())
      .then(setData);
  }

  useEffect(load, []);

  async function startDay() {
    setBusy(true);
    setError("");
    const res = await fetch("/api/admin/business-day", { method: "POST", body: "{}" });
    setBusy(false);
    if (!res.ok) {
      const d = await res.json();
      setError(d.error ?? "Could not start the day");
      return;
    }
    load();
  }

  async function endDay() {
    if (!confirm("End the current business day? This closes accounting for it.")) return;
    setBusy(true);
    setError("");
    const res = await fetch("/api/admin/business-day", { method: "PATCH", body: "{}" });
    setBusy(false);
    if (!res.ok) {
      const d = await res.json();
      setError(d.error ?? "Could not end the day");
      return;
    }
    load();
  }

  if (!data) return null;

  return (
    <div className="bg-ink text-panel rounded-2xl p-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted">Business day</p>
          {data.active ? (
            <>
              <p className="font-display text-2xl mt-1">{data.active.label}</p>
              <p className="text-muted text-xs mt-1">
                Started {new Date(data.active.startedAt).toLocaleTimeString()} by {data.active.startedBy}
              </p>
            </>
          ) : (
            <p className="font-display text-2xl mt-1 text-warning">No day is open</p>
          )}
        </div>

        {canEdit && (
          <button
            onClick={data.active ? endDay : startDay}
            disabled={busy}
            className={`px-5 py-2.5 rounded-full font-medium text-sm disabled:opacity-40 ${
              data.active ? "bg-fire text-white" : "bg-success text-white"
            }`}
          >
            {busy ? "Working…" : data.active ? "End Day" : "Start New Day"}
          </button>
        )}
      </div>

      {error && <p className="text-fire text-sm mt-3">{error}</p>}

      {data.active && (
        <div className="mt-6 pt-5 border-t border-white/10">
          <p className="text-xs uppercase tracking-wide text-muted mb-3">
            Collected this business day — {data.total?.toFixed(0)} EGP across {data.orderCount} orders
          </p>
          <div className="flex flex-wrap gap-3">
            {Object.entries(data.breakdown ?? {}).map(([method, amount]) => (
              <div key={method} className="px-4 py-3 rounded-xl bg-white/5 min-w-[110px]">
                <p className="text-xs text-muted">{METHOD_LABELS[method] ?? method}</p>
                <p className="font-mono text-lg font-semibold">{amount.toFixed(0)} EGP</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
