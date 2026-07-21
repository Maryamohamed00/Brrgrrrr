"use client";

import { useState } from "react";

export type Product = {
  id: string;
  name: string;
  price: number;
  imageUrl?: string | null;
  isBundle: boolean;
};
export type Category = {
  id: string;
  name: string;
  products: Product[];
};

export default function ProductGrid({
  categories,
  onAdd,
}: {
  categories: Category[];
  onAdd: (product: Product) => void;
}) {
  const [activeCat, setActiveCat] = useState(categories[0]?.id);
  const active = categories.find((c) => c.id === activeCat) ?? categories[0];

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="flex gap-2 px-6 pt-5 pb-3 overflow-x-auto">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveCat(cat.id)}
            className={`shrink-0 px-5 py-2.5 rounded-full text-sm font-medium transition-colors ${
              cat.id === active?.id
                ? "bg-ink text-panel"
                : "bg-card text-ink/70 border border-line"
            }`}
          >
            {cat.name}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-6 pb-6">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {active?.products.map((p) => (
            <button
              key={p.id}
              onClick={() => onAdd(p)}
              className="bg-card rounded-2xl p-4 text-left border border-line active:border-fire active:scale-[0.98] transition-all flex flex-col justify-between min-h-[130px] relative"
            >
              <div>
                <span className="font-medium leading-snug block">{p.name}</span>
                {p.isBundle && (
                  <span className="inline-block mt-1.5 text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded w-fit uppercase font-bold tracking-wider">
                    Combo Bundle
                  </span>
                )}
              </div>
              <span className="font-mono text-fire-dark font-semibold mt-2">
                {p.price.toFixed(2)} EGP
              </span>
            </button>
          ))}
          {!active?.products.length && (
            <p className="text-muted col-span-full py-10 text-center">
              No products in this category yet.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
