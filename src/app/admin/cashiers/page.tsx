"use client";

import { useEffect, useState } from "react";
import Modal from "@/components/admin/Modal";
import { useCanEdit } from "@/components/admin/RoleContext";

type Cashier = {
  id: string;
  name: string;
  role: "ADMIN" | "CASHIER" | "VIEWER";
  active: boolean;
  createdAt: string;
  _count: { orders: number };
};

export default function CashiersPage() {
  const [cashiers, setCashiers] = useState<Cashier[]>([]);
  const [modal, setModal] = useState<"create" | Cashier | null>(null);
  const canEdit = useCanEdit();

  function load() {
    fetch("/api/admin/cashiers")
      .then((r) => r.json())
      .then((d) => setCashiers(d.cashiers ?? []));
  }

  useEffect(load, []);

  async function toggleActive(c: Cashier) {
    await fetch(`/api/admin/cashiers/${c.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !c.active }),
    });
    load();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl">Cashiers</h1>
          <p className="text-muted text-sm">Manage staff who can log into the register</p>
        </div>
        <button
          onClick={() => setModal("create")}
          disabled={!canEdit}
          className="px-5 py-2.5 rounded-full bg-fire text-white font-medium text-sm disabled:opacity-30 disabled:cursor-not-allowed"
        >
          + Add cashier
        </button>
      </div>

      <div className="bg-card border border-line rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-panel text-muted text-xs uppercase tracking-wide">
            <tr>
              <th className="text-left px-5 py-3">Name</th>
              <th className="text-left px-5 py-3">Role</th>
              <th className="text-left px-5 py-3">Orders</th>
              <th className="text-left px-5 py-3">Status</th>
              <th className="text-right px-5 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {cashiers.map((c) => (
              <tr key={c.id} className="border-t border-line">
                <td className="px-5 py-3 font-medium">{c.name}</td>
                <td className="px-5 py-3">{c.role}</td>
                <td className="px-5 py-3">{c._count.orders}</td>
                <td className="px-5 py-3">
                  <span
                    className={`px-2.5 py-1 rounded-full text-xs ${
                      c.active ? "bg-success/10 text-success" : "bg-muted/10 text-muted"
                    }`}
                  >
                    {c.active ? "Active" : "Deactivated"}
                  </span>
                </td>
                <td className="px-5 py-3 text-right space-x-3">
                  {canEdit ? (
                    <>
                      <button onClick={() => setModal(c)} className="text-fire-dark font-medium">
                        Edit
                      </button>
                      <button onClick={() => toggleActive(c)} className="text-muted font-medium">
                        {c.active ? "Deactivate" : "Reactivate"}
                      </button>
                    </>
                  ) : (
                    <span className="text-muted text-xs">View only</span>
                  )}
                </td>
              </tr>
            ))}
            {cashiers.length === 0 && (
              <tr>
                <td colSpan={5} className="px-5 py-8 text-center text-muted">
                  No cashiers yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {modal && (
        <CashierModal
          cashier={modal === "create" ? null : modal}
          onClose={() => setModal(null)}
          onSaved={() => {
            setModal(null);
            load();
          }}
        />
      )}
    </div>
  );
}

function CashierModal({
  cashier,
  onClose,
  onSaved,
}: {
  cashier: Cashier | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(cashier?.name ?? "");
  const [role, setRole] = useState<"ADMIN" | "CASHIER" | "VIEWER">(cashier?.role ?? "CASHIER");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    setError("");
    const res = cashier
      ? await fetch(`/api/admin/cashiers/${cashier.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, role, ...(pin ? { pin } : {}) }),
        })
      : await fetch("/api/admin/cashiers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, role, pin }),
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
    <Modal title={cashier ? "Edit cashier" : "Add cashier"} onClose={onClose}>
      <div className="space-y-4">
        <div>
          <label className="text-xs text-muted font-medium">Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full mt-1 px-4 py-2.5 rounded-xl border border-line"
          />
        </div>
        <div>
          <label className="text-xs text-muted font-medium">Role</label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as "ADMIN" | "CASHIER" | "VIEWER")}
            className="w-full mt-1 px-4 py-2.5 rounded-xl border border-line bg-white"
          >
            <option value="CASHIER">Cashier</option>
            <option value="ADMIN">Admin</option>
            <option value="VIEWER">Viewer (read-only)</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-muted font-medium">
            {cashier ? "Reset PIN (leave blank to keep current)" : "PIN (4-6 digits)"}
          </label>
          <input
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
            maxLength={6}
            className="w-full mt-1 px-4 py-2.5 rounded-xl border border-line font-mono"
          />
        </div>
        {error && <p className="text-fire-dark text-sm">{error}</p>}
        <button
          onClick={save}
          disabled={saving || !name || (!cashier && pin.length < 4)}
          className="w-full py-3 rounded-xl bg-fire text-white font-semibold disabled:opacity-30"
        >
          {saving ? "Saving…" : "Save"}
        </button>
      </div>
    </Modal>
  );
}
