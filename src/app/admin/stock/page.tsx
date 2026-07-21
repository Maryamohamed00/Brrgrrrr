"use client";

import { useEffect, useState } from "react";
import Modal from "@/components/admin/Modal";
import { useCanEdit } from "@/components/admin/RoleContext";

type Ingredient = {
  id: string;
  name: string;
  unit: string;
  stockQty: number;
  lowStockThreshold: number;
  packSize: number | null;
  costPerUnit: number;
};

export default function StockPage() {
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [modal, setModal] = useState<"create" | Ingredient | null>(null);
  const canEdit = useCanEdit();

  function load() {
    fetch("/api/admin/ingredients")
      .then((r) => r.json())
      .then((d) => setIngredients(d.ingredients ?? []));
  }

  useEffect(load, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl">Stock & Ingredients</h1>
          <p className="text-muted text-sm">
            Fixed low-stock thresholds — a checkout warns the cashier once an
            ingredient drops to or below its threshold.
          </p>
        </div>
        <button
          onClick={() => setModal("create")}
          disabled={!canEdit}
          className="px-5 py-2.5 rounded-full bg-fire text-white font-medium text-sm disabled:opacity-30 disabled:cursor-not-allowed"
        >
          + Add ingredient
        </button>
      </div>

      <div className="bg-card border border-line rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-panel text-muted text-xs uppercase tracking-wide">
            <tr>
              <th className="text-left px-5 py-3">Name</th>
              <th className="text-left px-5 py-3">Stock</th>
              <th className="text-left px-5 py-3">Low-stock threshold</th>
              <th className="text-left px-5 py-3">Pack size</th>
              <th className="text-left px-5 py-3">Cost / unit</th>
              <th className="text-right px-5 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {ingredients.map((i) => {
              const low = i.stockQty <= i.lowStockThreshold;
              return (
                <tr key={i.id} className="border-t border-line">
                  <td className="px-5 py-3 font-medium">{i.name}</td>
                  <td className="px-5 py-3">
                    <span className={low ? "text-fire-dark font-semibold" : ""}>
                      {i.stockQty} {i.unit}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    {i.lowStockThreshold} {i.unit}
                  </td>
                  <td className="px-5 py-3">{i.packSize ?? "—"}</td>
                  <td className="px-5 py-3 font-mono">
                    {i.costPerUnit.toFixed(2)}
                  </td>
                  <td className="px-5 py-3 text-right">
                    {canEdit ? (
                      <button
                        onClick={() => setModal(i)}
                        className="text-fire-dark font-medium"
                      >
                        Edit / Restock
                      </button>
                    ) : (
                      <span className="text-muted text-xs">View only</span>
                    )}
                  </td>
                </tr>
              );
            })}
            {ingredients.length === 0 && (
              <tr>
                <td colSpan={6} className="px-5 py-8 text-center text-muted">
                  No ingredients yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {modal && (
        <IngredientModal
          ingredient={modal === "create" ? null : modal}
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

function IngredientModal({
  ingredient,
  onClose,
  onSaved,
}: {
  ingredient: Ingredient | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(ingredient?.name ?? "");
  const [unit, setUnit] = useState(ingredient?.unit ?? "");
  const [stockQty, setStockQty] = useState(String(ingredient?.stockQty ?? 0));
  const [setStockVal, setSetStockVal] = useState(
    String(ingredient?.stockQty ?? ""),
  );
  const [threshold, setThreshold] = useState(
    String(ingredient?.lowStockThreshold ?? 0),
  );
  const [packSize, setPackSize] = useState(String(ingredient?.packSize ?? ""));
  const [costPerUnit, setCostPerUnit] = useState(
    String(ingredient?.costPerUnit ?? 0),
  );
  const [restockBy, setRestockBy] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    setError("");
    const payload = {
      name,
      unit,
      lowStockThreshold: Number(threshold),
      packSize: packSize ? Number(packSize) : null,
      costPerUnit: Number(costPerUnit),
      ...(restockBy ? { restockBy: Number(restockBy) } : {}),
      ...(setStockVal !== String(ingredient?.stockQty ?? "")
        ? { setStockQty: Number(setStockVal) }
        : {}),
    };
    const res = ingredient
      ? await fetch(`/api/admin/ingredients/${ingredient.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
      : await fetch("/api/admin/ingredients", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...payload, stockQty: Number(stockQty) }),
        });
    setSaving(false);
    if (!res.ok) {
      const d = await res.json();
      setError(d.error ?? "Something went wrong");
      return;
    }
    onSaved();
  }

  async function remove() {
    if (!ingredient) return;
    const res = await fetch(`/api/admin/ingredients/${ingredient.id}/usage`);
    const { products } = await res.json();
    const msg = products.length
      ? `This ingredient is used in: ${products.map((p: any) => p.name + (p.isBundle ? " (bundle)" : "")).join(", ")}.\n\nDeleting it will remove it from those recipes. Continue?`
      : "Delete this ingredient? It isn't used in any recipe.";
    if (!confirm(msg)) return;
    await fetch(`/api/admin/ingredients/${ingredient.id}`, {
      method: "DELETE",
    });
    onSaved();
  }

  return (
    <Modal
      title={ingredient ? "Edit ingredient" : "Add ingredient"}
      onClose={onClose}
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-muted font-medium">Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full mt-1 px-4 py-2.5 rounded-xl border border-line"
            />
          </div>
          <div>
            <label className="text-xs text-muted font-medium">Unit</label>
            <input
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              placeholder="patty, g, slice…"
              className="w-full mt-1 px-4 py-2.5 rounded-xl border border-line"
            />
          </div>
        </div>

        {!ingredient && (
          <div>
            <label className="text-xs text-muted font-medium">
              Starting stock
            </label>
            <input
              value={stockQty}
              onChange={(e) => setStockQty(e.target.value)}
              type="number"
              className="w-full mt-1 px-4 py-2.5 rounded-xl border border-line font-mono"
            />
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-muted font-medium">
              Low-stock threshold
            </label>
            <input
              value={threshold}
              onChange={(e) => setThreshold(e.target.value)}
              type="number"
              className="w-full mt-1 px-4 py-2.5 rounded-xl border border-line font-mono"
            />
          </div>
          <div>
            <label className="text-xs text-muted font-medium">
              Pack size (optional)
            </label>
            <input
              value={packSize}
              onChange={(e) => setPackSize(e.target.value)}
              type="number"
              className="w-full mt-1 px-4 py-2.5 rounded-xl border border-line font-mono"
            />
          </div>
        </div>

        <div>
          <label className="text-xs text-muted font-medium">
            Cost per unit (for profit calc)
          </label>
          <input
            value={costPerUnit}
            onChange={(e) => setCostPerUnit(e.target.value)}
            type="number"
            className="w-full mt-1 px-4 py-2.5 rounded-xl border border-line font-mono"
          />
        </div>

        {ingredient && (
          <div className="space-y-3">
            <div>
              <label className="text-xs text-muted font-medium">
                Set exact stock (overrides current number)
              </label>
              <input
                value={setStockVal}
                onChange={(e) => setSetStockVal(e.target.value)}
                type="number"
                className="w-full mt-1 px-4 py-2.5 rounded-xl border border-line font-mono"
              />
            </div>
            <div>
              <label className="text-xs text-muted font-medium">
                Restock by (adds to current stock)
              </label>
              <input
                value={restockBy}
                onChange={(e) => setRestockBy(e.target.value)}
                type="number"
                placeholder="e.g. 20 (one new pack)"
                className="w-full mt-1 px-4 py-2.5 rounded-xl border border-line font-mono"
              />
            </div>
          </div>
        )}

        {error && <p className="text-fire-dark text-sm">{error}</p>}
        <button
          onClick={save}
          disabled={saving || !name || !unit}
          className="w-full py-3 rounded-xl bg-fire text-white font-semibold disabled:opacity-30"
        >
          {saving ? "Saving…" : "Save"}
        </button>

        {ingredient && (
          <button
            onClick={remove}
            className="w-full py-2 text-sm text-fire-dark font-medium"
          >
            Delete ingredient
          </button>
        )}
      </div>
    </Modal>
  );
}
