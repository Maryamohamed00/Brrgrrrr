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
  // New bulk fields
  unitName: string;
  packsPerUnit: number;
  servingsPerPack: number;
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
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-xl md:text-2xl">
            Stock & Ingredients
          </h1>
          <p className="text-muted text-xs md:text-sm">
            Fixed low-stock thresholds — a checkout warns the cashier once an
            ingredient drops to or below its threshold.
          </p>
        </div>
        <button
          onClick={() => setModal("create")}
          disabled={!canEdit}
          className="px-4 md:px-5 py-2 md:py-2.5 rounded-full bg-fire text-white font-medium text-sm disabled:opacity-30 disabled:cursor-not-allowed self-start sm:self-auto shrink-0"
        >
          + Add ingredient
        </button>
      </div>

      <div className="bg-card border border-line rounded-2xl overflow-hidden w-full">
        <div className="overflow-x-auto w-full">
          <table className="w-full text-sm min-w-[800px]">
            <thead className="bg-panel text-muted text-xs uppercase tracking-wide">
              <tr>
                <th className="text-left px-4 md:px-5 py-3">Name</th>
                <th className="text-left px-4 md:px-5 py-3">Total Servings</th>
                <th className="text-left px-4 md:px-5 py-3">Bulk Packaging</th>
                <th className="text-left px-4 md:px-5 py-3">
                  Low-stock warning
                </th>
                <th className="text-left px-4 md:px-5 py-3">Cost / serving</th>
                <th className="text-right px-4 md:px-5 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {ingredients.map((i) => {
                const low = i.stockQty <= i.lowStockThreshold;
                return (
                  <tr key={i.id} className="border-t border-line">
                    <td className="px-4 md:px-5 py-3 font-medium">{i.name}</td>
                    <td className="px-4 md:px-5 py-3">
                      <span
                        className={
                          low
                            ? "text-fire-dark font-semibold bg-fire/10 px-2 py-1 rounded"
                            : "font-mono"
                        }
                      >
                        {i.stockQty} {i.unit}
                      </span>
                    </td>
                    <td className="px-4 md:px-5 py-3 text-xs text-muted">
                      1 {i.unitName || "Unit"} = {i.packsPerUnit || 1} packs ×{" "}
                      {i.servingsPerPack || 1} {i.unit}
                    </td>
                    <td className="px-4 md:px-5 py-3">
                      {i.lowStockThreshold} {i.unit}
                    </td>
                    <td className="px-4 md:px-5 py-3 font-mono">
                      {i.costPerUnit.toFixed(2)}
                    </td>
                    <td className="px-4 md:px-5 py-3 text-right">
                      {canEdit ? (
                        <button
                          onClick={() => setModal(i)}
                          className="text-fire-dark font-medium px-3 py-1.5 hover:bg-fire/5 rounded-lg transition-colors"
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
  const [costPerUnit, setCostPerUnit] = useState(
    String(ingredient?.costPerUnit ?? 0),
  );

  // New Bulk Packaging States
  const [unitName, setUnitName] = useState(ingredient?.unitName ?? "Box");
  const [packsPerUnit, setPacksPerUnit] = useState(
    String(ingredient?.packsPerUnit ?? 1),
  );
  const [servingsPerPack, setServingsPerPack] = useState(
    String(ingredient?.servingsPerPack ?? 1),
  );

  // Calculator State for Restocking
  const [bulkRestockAmount, setBulkRestockAmount] = useState("");

  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  // Live Math Preview
  const totalNewServings =
    (Number(bulkRestockAmount) || 0) *
    (Number(packsPerUnit) || 1) *
    (Number(servingsPerPack) || 1);

  async function save() {
    setSaving(true);
    setError("");

    const payload = {
      name,
      unit,
      lowStockThreshold: Number(threshold),
      costPerUnit: Number(costPerUnit),
      unitName: unitName || "Item",
      packsPerUnit: Number(packsPerUnit) || 1,
      servingsPerPack: Number(servingsPerPack) || 1,
      ...(bulkRestockAmount ? { restockBy: totalNewServings } : {}), // Send the calculated math to the DB!
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
      <div className="space-y-4 max-h-[80vh] overflow-y-auto pr-1">
        {/* Basic Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-muted font-medium">
              Ingredient Name
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full mt-1 px-4 py-2.5 rounded-xl border border-line"
            />
          </div>
          <div>
            <label className="text-xs text-muted font-medium">
              Serving Unit (e.g. patty, slice)
            </label>
            <input
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              placeholder="patty, g, slice…"
              className="w-full mt-1 px-4 py-2.5 rounded-xl border border-line"
            />
          </div>
        </div>

        {/* Bulk Packaging Config */}
        <div className="col-span-full mt-2 pt-3 border-t border-line">
          <label className="text-[10px] text-muted font-bold uppercase tracking-wider mb-2 block">
            Bulk Packaging Setup
          </label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-muted font-medium">
                Bulk Unit Name
              </label>
              <input
                value={unitName}
                onChange={(e) => setUnitName(e.target.value)}
                placeholder="Box, Basket, Pack"
                className="w-full mt-1 px-3 py-2 rounded-xl border border-line text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-muted font-medium">
                Packs per {unitName || "Unit"}
              </label>
              <input
                value={packsPerUnit}
                onChange={(e) => setPacksPerUnit(e.target.value)}
                type="number"
                className="w-full mt-1 px-3 py-2 rounded-xl border border-line font-mono text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-muted font-medium">
                Servings per Pack
              </label>
              <input
                value={servingsPerPack}
                onChange={(e) => setServingsPerPack(e.target.value)}
                type="number"
                className="w-full mt-1 px-3 py-2 rounded-xl border border-line font-mono text-sm"
              />
            </div>
          </div>
        </div>

        {/* Alerts & Costs */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2 pt-3 border-t border-line">
          <div>
            <label className="text-xs text-muted font-medium">
              Low-stock alert threshold
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
              Cost per individual serving
            </label>
            <input
              value={costPerUnit}
              onChange={(e) => setCostPerUnit(e.target.value)}
              type="number"
              className="w-full mt-1 px-4 py-2.5 rounded-xl border border-line font-mono"
            />
          </div>
        </div>

        {!ingredient && (
          <div>
            <label className="text-xs text-muted font-medium">
              Starting total servings
            </label>
            <input
              value={stockQty}
              onChange={(e) => setStockQty(e.target.value)}
              type="number"
              className="w-full mt-1 px-4 py-2.5 rounded-xl border border-line font-mono"
            />
          </div>
        )}

        {/* Restocking Section */}
        {ingredient && (
          <div className="col-span-full mt-4 pt-4 border-t border-line space-y-3">
            <label className="text-[10px] text-muted font-bold uppercase tracking-wider block">
              Stock Adjustments
            </label>

            {/* The Magic Bulk Restock Calculator */}
            <div className="bg-success/5 border border-success/20 p-4 rounded-xl space-y-2">
              <label className="text-xs text-success-dark font-semibold">
                Quick Restock (Adds {unitName || "Unit"}s)
              </label>
              <input
                value={bulkRestockAmount}
                onChange={(e) => setBulkRestockAmount(e.target.value)}
                type="number"
                placeholder={`How many ${unitName || "Unit"}s did you receive?`}
                className="w-full px-4 py-2.5 rounded-xl border border-success/30 font-mono bg-white"
              />
              {Number(bulkRestockAmount) > 0 && (
                <p className="text-xs text-success-dark font-medium animate-in fade-in">
                  ↳ Adds {totalNewServings} individual servings to your total
                  stock.
                </p>
              )}
            </div>

            <div className="p-4 rounded-xl border border-line bg-panel space-y-2">
              <label className="text-xs text-muted font-medium">
                Manual Override (Fix incorrect stock counts)
              </label>
              <input
                value={setStockVal}
                onChange={(e) => setSetStockVal(e.target.value)}
                type="number"
                className="w-full px-4 py-2.5 rounded-xl border border-line font-mono"
              />
            </div>
          </div>
        )}

        {error && <p className="text-fire-dark text-sm">{error}</p>}
        <button
          onClick={save}
          disabled={saving || !name || !unit}
          className="w-full py-3.5 rounded-xl bg-fire text-white font-semibold disabled:opacity-30 mt-4"
        >
          {saving ? "Saving…" : "Save Ingredient"}
        </button>

        {ingredient && (
          <button
            onClick={remove}
            className="w-full py-2 text-sm text-fire-dark font-medium hover:underline"
          >
            Delete ingredient
          </button>
        )}
      </div>
    </Modal>
  );
}
