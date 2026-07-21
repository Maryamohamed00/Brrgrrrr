"use client";

import { useEffect, useState } from "react";
import Modal from "@/components/admin/Modal";
import { useCanEdit } from "@/components/admin/RoleContext";

type Ingredient = { id: string; name: string; unit: string };
type Category = { id: string; name: string };
type RecipeLine = {
  ingredientId: string;
  quantityUsed: number;
  ingredient?: Ingredient;
};
type Product = {
  id: string;
  name: string;
  price: number;
  active: boolean;
  isBundle: boolean;
  isArchived: boolean;
  category: Category | null;
  recipe: RecipeLine[];
};

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [modal, setModal] = useState<"create" | Product | null>(null);
  const [showArchived, setShowArchived] = useState(false);

  function load() {
    fetch("/api/admin/products")
      .then((r) => r.json())
      .then((d) => setProducts(d.products ?? []));
    fetch("/api/admin/ingredients")
      .then((r) => r.json())
      .then((d) => setIngredients(d.ingredients ?? []));
    fetch("/api/admin/categories")
      .then((r) => r.json())
      .then((d) => setCategories(d.categories ?? []));
  }

  useEffect(load, []);

  const visibleProducts = products.filter((p) => showArchived || !p.isArchived);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl">Products & Recipes</h1>
          <p className="text-muted text-sm">
            Build the bill-of-materials for each item. Combo meals or bundles
            allow cashiers to pick sub-items.
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="flex gap-2">
            <NewCategoryButton onCreated={load} />
            <button
              onClick={() => setModal("create")}
              className="px-5 py-2.5 rounded-full bg-fire text-white font-medium text-sm"
            >
              + Add product
            </button>
          </div>
          <label className="flex items-center gap-2 text-sm text-muted cursor-pointer">
            <input
              type="checkbox"
              checked={showArchived}
              onChange={(e) => setShowArchived(e.target.checked)}
              className="rounded"
            />
            Show archived/deleted
          </label>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {visibleProducts.map((p) => (
          <button
            key={p.id}
            onClick={() => setModal(p)}
            className={`text-left bg-card border rounded-2xl p-4 transition hover:border-ink ${
              p.active && !p.isArchived
                ? "border-line"
                : "border-line opacity-50 bg-gray-50"
            }`}
          >
            <div className="flex justify-between items-start mb-1">
              <p className="font-medium flex items-center gap-2">
                {p.name}
                {p.isArchived && (
                  <span className="text-[10px] bg-red-100 text-red-600 px-2 py-0.5 rounded-full uppercase font-bold">
                    Deleted
                  </span>
                )}
                {p.isBundle && (
                  <span className="text-[10px] bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full uppercase font-bold">
                    Bundle
                  </span>
                )}
              </p>
              <span className="font-mono text-fire-dark font-semibold">
                {p.price} EGP
              </span>
            </div>
            <p className="text-xs text-muted mb-3">
              {p.category?.name ?? "Uncategorized"}
            </p>
            {!p.isBundle && (
              <ul className="space-y-1">
                {p.recipe.map((r) => (
                  <li key={r.ingredientId} className="text-xs text-muted">
                    {r.quantityUsed}× {r.ingredient?.name}
                  </li>
                ))}
                {p.recipe.length === 0 && (
                  <li className="text-xs text-muted italic">No recipe set</li>
                )}
              </ul>
            )}
            {p.isBundle && (
              <p className="text-xs text-blue-600 italic">
                Dynamic bundle: cashiers pick items at checkout
              </p>
            )}
          </button>
        ))}
        {visibleProducts.length === 0 && (
          <p className="text-muted col-span-full py-8 text-center">
            No products found.
          </p>
        )}
      </div>

      {modal && (
        <ProductModal
          product={modal === "create" ? null : modal}
          ingredients={ingredients}
          categories={categories}
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

function NewCategoryButton({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const canEdit = useCanEdit();

  if (!canEdit) return null;

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="px-5 py-2.5 rounded-full border border-line text-sm font-medium"
      >
        + Category
      </button>
    );
  }

  return (
    <div className="flex gap-2">
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Category name"
        className="px-4 py-2.5 rounded-full border border-line text-sm"
      />
      <button
        onClick={async () => {
          if (!name) return;
          await fetch("/api/admin/categories", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name }),
          });
          setName("");
          setOpen(false);
          onCreated();
        }}
        className="px-4 py-2.5 rounded-full bg-ink text-panel text-sm font-medium"
      >
        Add
      </button>
    </div>
  );
}

function ProductModal({
  product,
  ingredients,
  categories,
  onClose,
  onSaved,
}: {
  product: Product | null;
  ingredients: Ingredient[];
  categories: Category[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const canEdit = useCanEdit();
  const [name, setName] = useState(product?.name ?? "");
  const [price, setPrice] = useState(String(product?.price ?? ""));
  const [categoryId, setCategoryId] = useState(product?.category?.id ?? "");
  const [isBundle, setIsBundle] = useState(product?.isBundle ?? false);
  const [recipe, setRecipe] = useState<RecipeLine[]>(
    product?.recipe.map((r) => ({
      ingredientId: r.ingredientId,
      quantityUsed: r.quantityUsed,
    })) ?? [],
  );
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  function addLine() {
    if (!ingredients.length) return;
    setRecipe((r) => [
      ...r,
      { ingredientId: ingredients[0].id, quantityUsed: 1 },
    ]);
  }
  function updateLine(idx: number, patch: Partial<RecipeLine>) {
    setRecipe((r) =>
      r.map((line, i) => (i === idx ? { ...line, ...patch } : line)),
    );
  }
  function removeLine(idx: number) {
    setRecipe((r) => r.filter((_, i) => i !== idx));
  }

  async function save() {
    setSaving(true);
    setError("");
    const payload = {
      name,
      price: Number(price),
      categoryId: categoryId || null,
      isBundle,
      recipe: isBundle
        ? []
        : recipe.map((r) => ({
            ingredientId: r.ingredientId,
            quantityUsed: r.quantityUsed,
          })),
    };
    const res = product
      ? await fetch(`/api/admin/products/${product.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
      : await fetch("/api/admin/products", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
    setSaving(false);
    if (!res.ok) {
      const d = await res.json();
      setError(d.error ?? "Something went wrong");
      return;
    }
    onSaved();
  }

  async function duplicateProduct() {
    if (!product) return;
    setSaving(true);
    const res = await fetch(`/api/admin/products/${product.id}`, {
      method: "POST",
    });
    setSaving(false);
    if (res.ok) onSaved();
  }

  async function deleteProduct() {
    if (!product) return;
    if (
      !confirm(
        "Are you sure you want to delete this product? If it has been ordered before, it will be safely archived instead.",
      )
    )
      return;
    setSaving(true);
    const res = await fetch(`/api/admin/products/${product.id}`, {
      method: "DELETE",
    });
    setSaving(false);
    if (res.ok) onSaved();
  }

  return (
    <Modal title={product ? "Edit product" : "Add product"} onClose={onClose}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-muted font-medium">Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={!canEdit}
              className="w-full mt-1 px-4 py-2.5 rounded-xl border border-line disabled:opacity-50"
            />
          </div>
          <div>
            <label className="text-xs text-muted font-medium">
              Price (EGP)
            </label>
            <input
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              type="number"
              disabled={!canEdit}
              className="w-full mt-1 px-4 py-2.5 rounded-xl border border-line font-mono disabled:opacity-50"
            />
          </div>
        </div>

        <div className="flex gap-4">
          <div className="flex-1">
            <label className="text-xs text-muted font-medium">Category</label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              disabled={!canEdit}
              className="w-full mt-1 px-4 py-2.5 rounded-xl border border-line bg-white disabled:opacity-50"
            >
              <option value="">Uncategorized</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col justify-end pb-3">
            <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
              <input
                type="checkbox"
                checked={isBundle}
                onChange={(e) => setIsBundle(e.target.checked)}
                disabled={!canEdit}
                className="w-4 h-4 rounded border-gray-300 disabled:opacity-50"
              />
              Is Bundle?
            </label>
          </div>
        </div>

        {!isBundle && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs text-muted font-medium">
                Recipe (ingredients this product consumes)
              </label>
              {canEdit && (
                <button
                  onClick={addLine}
                  className="text-xs text-fire-dark font-medium"
                >
                  + Add ingredient
                </button>
              )}
            </div>
            <div className="space-y-2">
              {recipe.map((line, idx) => (
                <div key={idx} className="flex gap-2 items-center">
                  <select
                    value={line.ingredientId}
                    onChange={(e) =>
                      updateLine(idx, { ingredientId: e.target.value })
                    }
                    disabled={!canEdit}
                    className="flex-1 px-3 py-2 rounded-lg border border-line bg-white text-sm disabled:opacity-50"
                  >
                    {ingredients.map((ing) => (
                      <option key={ing.id} value={ing.id}>
                        {ing.name}
                      </option>
                    ))}
                  </select>
                  <input
                    value={line.quantityUsed}
                    onChange={(e) =>
                      updateLine(idx, { quantityUsed: Number(e.target.value) })
                    }
                    type="number"
                    step="0.1"
                    disabled={!canEdit}
                    className="w-20 px-3 py-2 rounded-lg border border-line font-mono text-sm disabled:opacity-50"
                  />
                  {canEdit && (
                    <button
                      onClick={() => removeLine(idx)}
                      className="w-8 h-8 rounded-full bg-ink/10 shrink-0"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
              {recipe.length === 0 && (
                <p className="text-xs text-muted italic">
                  No ingredients yet — this product won't decrement any stock.
                </p>
              )}
            </div>
          </div>
        )}

        {isBundle && (
          <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl">
            <p className="text-sm text-blue-800">
              <strong>Bundle Mode Active:</strong> Recipes are disabled for
              bundles. Instead, the cashier will select the actual sandwich
              items and their notes when checking out. Stock will be accurately
              deducted based on the cashier's selections.
            </p>
          </div>
        )}

        {error && <p className="text-fire-dark text-sm">{error}</p>}

        {canEdit && (
          <>
            <button
              onClick={save}
              disabled={saving || !name || !price}
              className="w-full py-3 rounded-xl bg-fire text-white font-semibold disabled:opacity-30"
            >
              {saving ? "Saving…" : "Save"}
            </button>

            {product && (
              <div className="flex gap-2 pt-2">
                <button
                  onClick={duplicateProduct}
                  disabled={saving}
                  className="flex-1 py-2.5 rounded-xl bg-gray-100 text-ink font-medium text-sm hover:bg-gray-200 transition disabled:opacity-50"
                >
                  Duplicate
                </button>
                <button
                  onClick={deleteProduct}
                  disabled={saving}
                  className="flex-1 py-2.5 rounded-xl bg-red-50 text-red-600 font-medium text-sm hover:bg-red-100 transition disabled:opacity-50"
                >
                  Delete
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </Modal>
  );
}
