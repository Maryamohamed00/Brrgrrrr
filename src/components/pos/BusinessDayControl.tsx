"use client";

import { useState } from "react";

export default function BusinessDayControl({
  isOpen,
  onChanged,
}: {
  isOpen: boolean;
  onChanged: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function startDay() {
    setBusy(true);
    setError("");
    const res = await fetch("/api/admin/business-day", {
      method: "POST",
      body: "{}",
    });
    setBusy(false);
    if (!res.ok) {
      const d = await res.json();
      setError(d.error ?? "Could not start the day");
      return;
    }
    onChanged();
  }

  async function endDay() {
    if (
      !confirm("End the current business day? This closes accounting for it.")
    )
      return;
    setBusy(true);
    setError("");
    const res = await fetch("/api/admin/business-day", {
      method: "PATCH",
      body: "{}",
    });
    setBusy(false);
    if (!res.ok) {
      const d = await res.json();
      setError(d.error ?? "Could not end the day");
      return;
    }
    onChanged();
  }

  return (
    <div className="flex items-center gap-2">
      {error && <span className="text-fire text-xs">{error}</span>}
      <button
        onClick={isOpen ? endDay : startDay}
        disabled={busy}
        className={`text-xs px-3 py-1.5 rounded-full font-medium disabled:opacity-40 ${
          isOpen ? "bg-fire text-white" : "bg-success text-white"
        }`}
      >
        {busy ? "Working…" : isOpen ? "End Day" : "Start New Day"}
      </button>
    </div>
  );
}
