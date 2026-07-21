"use client";

import { useState, useEffect } from "react";

type Cashier = { id: string; name: string };
type SplitData = {
  totalGrossSales: number;
  myCut: number;
  cafeCut: number;
  orderCount: number;
  orders: {
    id: string;
    total: number;
    createdAt: string;
    orderNumber: number;
  }[];
};

export default function CafeSplitDashboard() {
  const [cashiers, setCashiers] = useState<Cashier[]>([]);
  const [selectedCashier, setSelectedCashier] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [data, setData] = useState<SplitData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Fetch all cashiers so you can specifically select your "Cafe Register"
    fetch("/api/admin/cashiers")
      .then((res) => res.json())
      .then((data) => {
        if (data.cashiers) setCashiers(data.cashiers);
      })
      .catch((err) => console.error("Failed to load cashiers", err));
  }, []);

  const fetchSplit = async () => {
    if (!selectedCashier) return alert("Please select a cashier first.");
    setLoading(true);

    let url = `/api/admin/cafe-split?cashierId=${selectedCashier}`;
    if (startDate) url += `&startDate=${startDate}T00:00:00.000Z`;
    if (endDate) url += `&endDate=${endDate}T23:59:59.999Z`;

    try {
      const res = await fetch(url);
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setData(json);
    } catch (error) {
      console.error(error);
      alert("Failed to fetch split data");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Cafe Revenue Split (70/30)</h1>

      {/* Filters and Controls */}
      <div className="bg-white p-4 rounded shadow mb-6 flex flex-wrap gap-4 items-end">
        <div>
          <label className="block text-sm font-semibold mb-1">
            Select Register
          </label>
          <select
            className="border p-2 rounded w-48"
            value={selectedCashier}
            onChange={(e) => setSelectedCashier(e.target.value)}
          >
            <option value="">-- Choose Cashier --</option>
            {cashiers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-semibold mb-1">Start Date</label>
          <input
            type="date"
            className="border p-2 rounded"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm font-semibold mb-1">End Date</label>
          <input
            type="date"
            className="border p-2 rounded"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>

        <button
          onClick={fetchSplit}
          disabled={loading || !selectedCashier}
          className="bg-blue-600 text-white px-4 py-2 rounded font-semibold disabled:opacity-50"
        >
          {loading ? "Calculating..." : "Calculate Split"}
        </button>
      </div>

      {/* Math Results */}
      {data && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white p-6 rounded shadow border-l-4 border-gray-500">
            <div className="text-sm text-gray-500 font-bold uppercase">
              Total Gross Sales
            </div>
            <div className="text-3xl font-bold">
              {data.totalGrossSales.toFixed(2)} EGP
            </div>
            <div className="text-sm mt-1 text-gray-400">
              {data.orderCount} orders processed
            </div>
          </div>

          <div className="bg-white p-6 rounded shadow border-l-4 border-green-500">
            <div className="text-sm text-gray-500 font-bold uppercase">
              My Cut (70%)
            </div>
            <div className="text-3xl font-bold text-green-700">
              {data.myCut.toFixed(2)} EGP
            </div>
          </div>

          <div className="bg-white p-6 rounded shadow border-l-4 border-blue-500">
            <div className="text-sm text-gray-500 font-bold uppercase">
              Cafe Cut (30%)
            </div>
            <div className="text-3xl font-bold text-blue-700">
              {data.cafeCut.toFixed(2)} EGP
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
