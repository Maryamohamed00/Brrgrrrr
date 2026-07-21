"use client";

import { useEffect, useState } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
} from "recharts";
import StatCard from "@/components/admin/StatCard";
import BusinessDayCard from "@/components/admin/BusinessDayCard";

type Analytics = {
  revenue: number;
  orderCount: number;
  revenueTrend: { date: string; total: number }[];
  topProducts: { name: string; qty: number; revenue: number }[];
  statusCounts: Record<string, number>;
  lowStock: { id: string; name: string; stockQty: number; lowStockThreshold: number; unit: string }[];
};

export default function AdminOverviewPage() {
  const [data, setData] = useState<Analytics | null>(null);

  useEffect(() => {
    fetch("/api/admin/analytics?days=14")
      .then((r) => r.json())
      .then(setData);
  }, []);

  if (!data) return <p className="text-muted">Loading overview…</p>;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl">Overview</h1>
        <p className="text-muted text-sm">Last 14 days</p>
      </div>

      <BusinessDayCard />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Revenue" value={`${data.revenue.toFixed(0)} EGP`} accent />
        <StatCard label="Orders" value={String(data.orderCount)} />
        <StatCard
          label="Avg order value"
          value={`${(data.orderCount ? data.revenue / data.orderCount : 0).toFixed(0)} EGP`}
        />
        <StatCard label="Low stock alerts" value={String(data.lowStock.length)} accent={data.lowStock.length > 0} />
      </div>

      {data.lowStock.length > 0 && (
        <div className="bg-card border border-warning/40 rounded-2xl p-5">
          <p className="font-semibold text-sm mb-3">Low stock — restock soon</p>
          <div className="flex flex-wrap gap-2">
            {data.lowStock.map((i) => (
              <span
                key={i.id}
                className="px-3 py-1.5 rounded-full bg-warning/10 text-sm border border-warning/30"
              >
                {i.name}: {i.stockQty} {i.unit} left (threshold {i.lowStockThreshold})
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-card border border-line rounded-2xl p-5">
          <p className="font-semibold text-sm mb-4">Revenue trend</p>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={data.revenueTrend}>
              <CartesianGrid stroke="#E4DFD6" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(d) => d.slice(5)} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Line type="monotone" dataKey="total" stroke="#FF5A36" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-card border border-line rounded-2xl p-5">
          <p className="font-semibold text-sm mb-4">Top products (by qty sold)</p>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={data.topProducts} layout="vertical" margin={{ left: 20 }}>
              <CartesianGrid stroke="#E4DFD6" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={110} />
              <Tooltip />
              <Bar dataKey="qty" fill="#1C1B1A" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-card border border-line rounded-2xl p-5">
        <p className="font-semibold text-sm mb-4">Orders by status</p>
        <div className="flex flex-wrap gap-3">
          {Object.entries(data.statusCounts).map(([status, count]) => (
            <div key={status} className="px-4 py-3 rounded-xl bg-panel border border-line">
              <p className="text-xs text-muted">{status}</p>
              <p className="font-display text-xl">{count}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
