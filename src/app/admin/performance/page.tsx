"use client";

import { Fragment, useEffect, useState } from "react";
import StatCard from "@/components/admin/StatCard";

type CashierPerf = {
  id: string;
  name: string;
  active: boolean;
  totalSales: number;
  orderCount: number;
  avgOrderValue: number;
  totalHours: number;
  openShift: { id: string; clockIn: string } | null;
  shifts: { id: string; clockIn: string; clockOut: string | null }[];
};

export default function PerformancePage() {
  const [rows, setRows] = useState<CashierPerf[]>([]);
  const [bestId, setBestId] = useState<string | null>(null);
  const [days, setDays] = useState(30);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/admin/performance?days=${days}`)
      .then((r) => r.json())
      .then((d) => {
        setRows(d.cashiers ?? []);
        setBestId(d.bestPerformerId);
      });
  }, [days]);

  const best = rows.find((r) => r.id === bestId);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl">Cashier Performance</h1>
          <p className="text-muted text-sm">Sales, order counts, and shift tracking</p>
        </div>
        <select
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
          className="px-4 py-2 rounded-full border border-line text-sm bg-white"
        >
          <option value={7}>Last 7 days</option>
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
        </select>
      </div>

      {best && (
        <StatCard
          label="Top performer"
          value={best.name}
          sublabel={`${best.totalSales.toFixed(0)} EGP across ${best.orderCount} orders`}
          accent
        />
      )}

      <div className="bg-card border border-line rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-panel text-muted text-xs uppercase tracking-wide">
            <tr>
              <th className="text-left px-5 py-3">Cashier</th>
              <th className="text-left px-5 py-3">Total sales</th>
              <th className="text-left px-5 py-3">Orders</th>
              <th className="text-left px-5 py-3">Avg order</th>
              <th className="text-left px-5 py-3">Hours worked</th>
              <th className="text-left px-5 py-3">Status</th>
              <th className="text-right px-5 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <Fragment key={r.id}>
                <tr className="border-t border-line">
                  <td className="px-5 py-3 font-medium">
                    {r.name}
                    {r.id === bestId && (
                      <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-fire/10 text-fire-dark">
                        Top performer
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3 font-mono">{r.totalSales.toFixed(0)} EGP</td>
                  <td className="px-5 py-3">{r.orderCount}</td>
                  <td className="px-5 py-3 font-mono">{r.avgOrderValue.toFixed(0)} EGP</td>
                  <td className="px-5 py-3">{r.totalHours}h</td>
                  <td className="px-5 py-3">
                    {r.openShift ? (
                      <span className="px-2.5 py-1 rounded-full text-xs bg-success/10 text-success">
                        On shift
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-full text-xs bg-muted/10 text-muted">
                        Off shift
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <button
                      onClick={() => setExpanded(expanded === r.id ? null : r.id)}
                      className="text-fire-dark font-medium text-xs"
                    >
                      {expanded === r.id ? "Hide shifts" : "View shifts"}
                    </button>
                  </td>
                </tr>
                {expanded === r.id && (
                  <tr className="bg-panel/50">
                    <td colSpan={7} className="px-5 py-4">
                      <ul className="space-y-1 text-xs text-muted">
                        {r.shifts.map((s) => (
                          <li key={s.id}>
                            {new Date(s.clockIn).toLocaleString()} →{" "}
                            {s.clockOut ? new Date(s.clockOut).toLocaleString() : "still clocked in"}
                          </li>
                        ))}
                        {r.shifts.length === 0 && <li>No shifts in this period.</li>}
                      </ul>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-5 py-8 text-center text-muted">
                  No cashier activity in this period.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
