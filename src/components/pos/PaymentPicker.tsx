"use client";

import { useEffect, useRef, useState } from "react";

const METHODS = [
  { id: "CASH", label: "Cash" },
  { id: "VODAFONE_CASH", label: "Vodafone Cash" },
  { id: "INSTAPAY", label: "Instapay" },
  { id: "TELDA", label: "Telda" },
  { id: "CREDIT_CARD", label: "Credit" },
] as const;

const DISCOUNTS = [
  { id: "", label: "No discount" },
  { id: "Owner (10% Off)", label: "Owner (10% Off)" },
  { id: "Staff (25% Off)", label: "Staff (25% Off)" },
  { id: "Custom Amount", label: "Custom Amount" },
] as const;

export type CheckoutPayload = {
  method: string;
  phone: string;
  name: string;
  orderType: "PICKUP" | "DELIVERY";
  discountLabel: string;
  customDiscountAmount: number;
  notes: string;
};

export default function PaymentPicker({
  disabled,
  onCheckout,
  onChange,
  resetSignal,
}: {
  disabled: boolean;
  onCheckout: (payload: CheckoutPayload) => void;
  onChange?: (state: {
    orderType: "PICKUP" | "DELIVERY";
    discountLabel: string;
    customDiscountAmount: number;
  }) => void;
  resetSignal?: number;
}) {
  const [method, setMethod] = useState<string>("CASH");
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [orderType, setOrderType] = useState<"PICKUP" | "DELIVERY">("PICKUP");
  const [discountLabel, setDiscountLabel] = useState("");
  const [customDiscountAmount, setCustomDiscountAmount] = useState("");
  const [notes, setNotes] = useState("");

  const [customer, setCustomer] = useState<{
    name: string | null;
    totalOrders: number;
    isLoyal: boolean;
  } | null>(null);

  // Report changes live to the parent page so total/offers calculate before submit
  useEffect(() => {
    onChange?.({
      orderType,
      discountLabel,
      customDiscountAmount: Number(customDiscountAmount) || 0,
    });
  }, [orderType, discountLabel, customDiscountAmount, onChange]);

  // Reset form notes, payment method, customer info, order type, and discounts when an order succeeds
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    setNotes("");
    setMethod("CASH");
    setName("");
    setPhone("");
    setOrderType("PICKUP");
    setDiscountLabel("");
    setCustomDiscountAmount("");
  }, [resetSignal]);

  // Look up the customer by phone as the cashier types, so the loyalty
  // badge and known name show up before checkout.
  useEffect(() => {
    if (phone.length < 6) {
      setCustomer(null);
      return;
    }
    const id = setTimeout(() => {
      fetch(`/api/customers?phone=${encodeURIComponent(phone)}`)
        .then((r) => r.json())
        .then((d) => setCustomer(d.customer))
        .catch(() => setCustomer(null));
    }, 400);
    return () => clearTimeout(id);
  }, [phone]);

  function submit() {
    onCheckout({
      method,
      phone,
      name: name || customer?.name || "",
      orderType,
      discountLabel,
      customDiscountAmount: Number(customDiscountAmount) || 0,
      notes,
    });
  }

  return (
    <div className="p-4 md:p-5 border-t border-line bg-panel space-y-3 md:space-y-4">
      {/* Order type */}
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => setOrderType("PICKUP")}
          className={`py-2 md:py-2.5 rounded-xl text-xs md:text-sm font-medium border transition-colors ${
            orderType === "PICKUP"
              ? "bg-ink text-panel border-ink"
              : "bg-card border-line text-ink/70"
          }`}
        >
          Pickup
        </button>
        <button
          onClick={() => setOrderType("DELIVERY")}
          className={`py-2 md:py-2.5 rounded-xl text-xs md:text-sm font-medium border transition-colors ${
            orderType === "DELIVERY"
              ? "bg-fire text-white border-fire"
              : "bg-card border-line text-ink/70"
          }`}
        >
          Delivery (+fee)
        </button>
      </div>

      {/* Payment methods - 2 columns on mobile, 3 on desktop */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        {METHODS.map((m) => (
          <button
            key={m.id}
            onClick={() => setMethod(m.id)}
            className={`py-2 md:py-2.5 rounded-xl text-[11px] md:text-xs font-medium border transition-colors ${
              method === m.id
                ? "bg-ink text-panel border-ink"
                : "bg-card border-line text-ink/70"
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      {/* Discount */}
      <div className="flex gap-2">
        <select
          value={discountLabel}
          onChange={(e) => setDiscountLabel(e.target.value)}
          className="flex-1 px-3 py-2 md:py-2.5 rounded-xl border border-line text-xs md:text-sm bg-card"
        >
          {DISCOUNTS.map((d) => (
            <option key={d.id} value={d.id}>
              {d.label}
            </option>
          ))}
        </select>
        {discountLabel === "Custom Amount" && (
          <input
            value={customDiscountAmount}
            onChange={(e) => setCustomDiscountAmount(e.target.value)}
            type="number"
            placeholder="EGP off"
            className="w-24 md:w-28 px-3 py-2 md:py-2.5 rounded-xl border border-line text-xs md:text-sm font-mono bg-card"
          />
        )}
      </div>

      {/* Order notes */}
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Order notes (e.g. no onions, extra napkins)"
        rows={2}
        className="w-full px-3 md:px-4 py-2 md:py-2.5 rounded-xl border border-line text-xs md:text-sm bg-card resize-none"
      />

      {/* Customer - 1 column on mobile, 2 on desktop */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Customer name"
          className="px-3 md:px-4 py-2 md:py-2.5 rounded-xl border border-line text-xs md:text-sm bg-card"
        />
        <input
          type="tel"
          inputMode="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="WhatsApp number"
          className="px-3 md:px-4 py-2 md:py-2.5 rounded-xl border border-line text-xs md:text-sm bg-card"
        />
      </div>

      {customer?.isLoyal && (
        <div className="px-3 py-2 rounded-lg bg-warning/10 text-warning text-xs font-medium">
          ⭐ Loyal Customer — {customer.totalOrders} past orders
          {customer.name ? ` (${customer.name})` : ""}
        </div>
      )}

      <button
        disabled={disabled}
        onClick={submit}
        className="w-full py-3 md:py-4 rounded-xl bg-fire text-white font-semibold text-base md:text-lg disabled:opacity-30 active:bg-fire-dark transition-colors"
      >
        Charge & Send to Kitchen
      </button>
    </div>
  );
}
