"use client";

import { useEffect, useState } from "react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import StatCard from "@/components/admin/StatCard";
import Modal from "@/components/admin/Modal";
import { useCanEdit } from "@/components/admin/RoleContext";

type Finances = {
  revenue: number;
  cogs: number;
  expenseTotal: number;
  profit: number;
  paymentBreakdown: Record<string, number>;
  expensesByCategory: Record<string, number>;
  dailyRevenue: { date: string; total: number }[];
  orderCount: number;
  // Add these:
  totalCafeRevenue?: number;
  myCut?: number;
  cafeCut?: number;
};

type Expense = {
  id: string;
  category: string;
  description: string;
  amount: number;
  date: string;
};

const COLORS = ["#FF5A36", "#1C1B1A", "#2FA84F", "#E8A33D", "#8A8579"];

export default function FinancesPage() {
  const [finances, setFinances] = useState<Finances | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [days, setDays] = useState(30);
  const canEdit = useCanEdit();

  function load() {
    fetch(`/api/admin/finances?days=${days}`)
      .then((r) => r.json())
      .then(setFinances);
    fetch("/api/admin/expenses")
      .then((r) => r.json())
      .then((d) => setExpenses(d.expenses ?? []));
  }

  useEffect(load, [days]);

  if (!finances) return <p className="text-muted">Loading finances…</p>;

  const paymentData = Object.entries(finances.paymentBreakdown).map(
    ([name, value]) => ({
      name,
      value,
    }),
  );

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl">Finances</h1>
          <p className="text-muted text-sm">
            Revenue, cost of goods, expenses, and profit
          </p>
        </div>
        <div className="flex gap-2 items-center">
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="px-4 py-2 rounded-full border border-line text-sm bg-white"
          >
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
          {canEdit && (
            <button
              onClick={() => setShowExpenseModal(true)}
              className="px-5 py-2.5 rounded-full bg-fire text-white font-medium text-sm"
            >
              + Log expense
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Revenue"
          value={`${finances.revenue.toFixed(0)} EGP`}
        />
        <StatCard
          label="Cost of goods"
          value={`${finances.cogs.toFixed(0)} EGP`}
        />
        <StatCard
          label="Expenses"
          value={`${finances.expenseTotal.toFixed(0)} EGP`}
        />
        <StatCard
          label="Profit"
          value={`${finances.profit.toFixed(0)} EGP`}
          accent={finances.profit >= 0}
        />
      </div>
      {finances.totalCafeRevenue !== undefined && (
        <div className="bg-card border border-line rounded-2xl p-5 space-y-4">
          <h2 className="font-semibold text-sm">Cafe Revenue Split (70/30)</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-panel rounded-xl">
              <p className="text-xs text-muted uppercase">Total Cafe Revenue</p>
              <p className="text-xl font-bold">
                {finances.totalCafeRevenue.toFixed(0)} EGP
              </p>
            </div>
            <div className="p-4 bg-green-50 border border-green-200 rounded-xl">
              <p className="text-xs text-green-700 uppercase">Your 70% Cut</p>
              <p className="text-xl font-bold text-green-800">
                {finances.myCut?.toFixed(0)} EGP
              </p>
            </div>
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
              <p className="text-xs text-blue-700 uppercase">Cafe 30% Cut</p>
              <p className="text-xl font-bold text-blue-800">
                {finances.cafeCut?.toFixed(0)} EGP
              </p>
            </div>
          </div>
        </div>
      )}
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-card border border-line rounded-2xl p-5">
          <p className="font-semibold text-sm mb-4">Revenue by day</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={finances.dailyRevenue}>
              <CartesianGrid stroke="#E4DFD6" vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10 }}
                tickFormatter={(d) => d.slice(5)}
              />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="total" fill="#FF5A36" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-card border border-line rounded-2xl p-5">
          <p className="font-semibold text-sm mb-4">
            Revenue by payment method
          </p>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={paymentData}
                dataKey="value"
                nameKey="name"
                innerRadius={50}
                outerRadius={80}
              >
                {paymentData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-card border border-line rounded-2xl overflow-hidden">
        <div className="px-5 py-3 border-b border-line">
          <p className="font-semibold text-sm">Recent expenses</p>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-panel text-muted text-xs uppercase tracking-wide">
            <tr>
              <th className="text-left px-5 py-3">Date</th>
              <th className="text-left px-5 py-3">Category</th>
              <th className="text-left px-5 py-3">Description</th>
              <th className="text-right px-5 py-3">Amount</th>
            </tr>
          </thead>
          <tbody>
            {expenses.map((e) => (
              <tr key={e.id} className="border-t border-line">
                <td className="px-5 py-3">
                  {new Date(e.date).toLocaleDateString()}
                </td>
                <td className="px-5 py-3">{e.category}</td>
                <td className="px-5 py-3">{e.description}</td>
                <td className="px-5 py-3 text-right font-mono">
                  {e.amount.toFixed(2)}
                </td>
              </tr>
            ))}
            {expenses.length === 0 && (
              <tr>
                <td colSpan={4} className="px-5 py-8 text-center text-muted">
                  No expenses logged yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showExpenseModal && (
        <ExpenseModal
          onClose={() => setShowExpenseModal(false)}
          onSaved={() => {
            setShowExpenseModal(false);
            load();
          }}
        />
      )}
    </div>
  );
}

function ExpenseModal({
  onClose,
  onSaved,
}: {
  onClose: () => void;
  onSaved: () => void;
}) {
  const [category, setCategory] = useState("Restock");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    setError("");
    const res = await fetch("/api/admin/expenses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category, description, amount: Number(amount) }),
    });
    setSaving(false);
    if (!res.ok) {
      const d = await res.json();
      setError(d.error ?? "Something went wrong");
      return;
    }
    onSaved();
  }

  return (
    <Modal title="Log an expense" onClose={onClose}>
      <div className="space-y-4">
        <div>
          <label className="text-xs text-muted font-medium">Category</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full mt-1 px-4 py-2.5 rounded-xl border border-line bg-white"
          >
            {[
              "Rent",
              "Utilities",
              "Wages",
              "Restock",
              "Marketing",
              "Other",
            ].map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs text-muted font-medium">Description</label>
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full mt-1 px-4 py-2.5 rounded-xl border border-line"
          />
        </div>
        <div>
          <label className="text-xs text-muted font-medium">Amount (EGP)</label>
          <input
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            type="number"
            className="w-full mt-1 px-4 py-2.5 rounded-xl border border-line font-mono"
          />
        </div>
        {error && <p className="text-fire-dark text-sm">{error}</p>}
        <button
          onClick={save}
          disabled={saving || !description || !amount}
          className="w-full py-3 rounded-xl bg-fire text-white font-semibold disabled:opacity-30"
        >
          {saving ? "Saving…" : "Save"}
        </button>
      </div>
    </Modal>
  );
}
