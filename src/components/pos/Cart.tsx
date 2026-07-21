"use client";

export type CartLineSubItem = {
  productId: string;
  productName: string;
  quantity: number;
  note: string;
};

export type CartLine = {
  lineId: string; // Unique ID so bundles with different items don't merge together
  productId: string;
  name: string;
  price: number;
  quantity: number;
  isBundle?: boolean;
  subItems?: CartLineSubItem[];
};

export default function Cart({
  lines,
  deliveryFee,
  discountLabel,
  discountAmount,
  onIncrement,
  onDecrement,
  onRemove,
}: {
  lines: CartLine[];
  deliveryFee: number;
  discountLabel: string | null;
  discountAmount: number;
  onIncrement: (lineId: string) => void;
  onDecrement: (lineId: string) => void;
  onRemove: (lineId: string) => void;
}) {
  const subtotal = lines.reduce((sum, l) => sum + l.price * l.quantity, 0);
  const total = Math.max(0, subtotal - discountAmount + deliveryFee);

  return (
    <div className="ticket-edge bg-panel flex-1 overflow-y-auto px-5 pt-6 pb-4">
      {lines.length === 0 && (
        <p className="text-muted text-sm text-center py-12">
          Tap items to add them to the order
        </p>
      )}

      <ul className="space-y-4">
        {lines.map((l) => (
          <li
            key={l.lineId}
            className="flex flex-col gap-2 border-b border-line/30 pb-3 last:border-0 last:pb-0"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm leading-snug flex items-center gap-1.5">
                  {l.name}
                  {l.isBundle && (
                    <span className="text-[9px] bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
                      Bundle
                    </span>
                  )}
                </p>
                <p className="font-mono text-xs text-muted mt-0.5">
                  {l.price.toFixed(2)} × {l.quantity}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => onDecrement(l.lineId)}
                  className="w-8 h-8 rounded-full bg-ink/10 font-semibold active:bg-ink active:text-panel transition"
                >
                  −
                </button>
                <span className="font-mono w-5 text-center">{l.quantity}</span>
                <button
                  onClick={() => onIncrement(l.lineId)}
                  className="w-8 h-8 rounded-full bg-ink/10 font-semibold active:bg-ink active:text-panel transition"
                >
                  +
                </button>
              </div>
            </div>

            {/* Display Sub-items directly in the Cart */}
            {l.subItems && l.subItems.length > 0 && (
              <ul className="ml-2 pl-3 border-l-2 border-gray-200 space-y-1.5">
                {l.subItems.map((sub, idx) => (
                  <li key={idx} className="flex flex-col text-xs">
                    <span className="text-ink font-medium">
                      - {sub.quantity}x {sub.productName}
                    </span>
                    {sub.note && (
                      <span className="text-fire-dark italic ml-3 mt-0.5">
                        "{sub.note}"
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>

      {lines.length > 0 && (
        <div className="mt-6 pt-4 border-t border-dashed border-line space-y-1.5">
          <div className="flex justify-between text-sm text-muted">
            <span>Subtotal</span>
            <span className="font-mono">{subtotal.toFixed(2)}</span>
          </div>
          {deliveryFee > 0 && (
            <div className="flex justify-between text-sm text-muted">
              <span>Delivery fee</span>
              <span className="font-mono">+{deliveryFee.toFixed(2)}</span>
            </div>
          )}
          {discountAmount > 0 && (
            <div className="flex justify-between text-sm text-success">
              <span>{discountLabel ?? "Discount"}</span>
              <span className="font-mono">-{discountAmount.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between font-mono text-lg font-semibold pt-1">
            <span className="font-body font-medium text-base">Total</span>
            <span>{total.toFixed(2)} EGP</span>
          </div>
        </div>
      )}
    </div>
  );
}
