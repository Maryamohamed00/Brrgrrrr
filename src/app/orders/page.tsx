"use client";

import { Fragment, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ReceiptPrint, { ReceiptOrder } from "@/components/pos/ReceiptPrint";
import Modal from "@/components/admin/Modal";

type OrderItemSubItem = {
  id: string;
  quantity: number;
  note: string | null;
  product: { name: string };
};

type OrderItem = {
  id: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  product: { name: string; isBundle: boolean };
  subItems: OrderItemSubItem[];
};

type OrderRow = {
  id: string;
  orderNumber: number;
  status: string;
  paymentMethod: string | null;
  orderType: string;
  subtotal: number;
  deliveryFee: number;
  discountLabel: string | null;
  discountAmount: number;
  total: number;
  customerName: string | null;
  customerPhone: string | null;
  createdAt: string;
  cashier: { name: string };
  businessDay: { label: string };
  items: OrderItem[];
  notes: string | null;
};

const PAYMENT_METHODS = [
  "CASH",
  "VODAFONE_CASH",
  "INSTAPAY",
  "TELDA",
  "CREDIT_CARD",
];
const STATUSES = [
  "OPEN",
  "PAID",
  "READY",
  "COMPLETED",
  "REFUNDED",
  "CANCELLED",
];

const STATUS_COLORS: Record<string, string> = {
  PAID: "bg-warning/10 text-warning",
  READY: "bg-success/10 text-success",
  COMPLETED: "bg-ink/10 text-ink",
  REFUNDED: "bg-fire/10 text-fire-dark",
  CANCELLED: "bg-muted/10 text-muted",
};

export default function OrdersPage() {
  const router = useRouter();
  const [role, setRole] = useState<"ADMIN" | "CASHIER" | "VIEWER" | null>(null);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [cashiers, setCashiers] = useState<{ id: string; name: string }[]>([]);
  const [businessDays, setBusinessDays] = useState<
    { id: string; label: string }[]
  >([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<ReceiptOrder | null>(null);
  const [editOrder, setEditOrder] = useState<OrderRow | null>(null);
  const [bizInfo, setBizInfo] = useState({
    businessName: "Counter",
    currency: "EGP",
  });

  const [filters, setFilters] = useState({
    businessDayId: "",
    cashierId: "",
    paymentMethod: "",
    status: "",
    from: "",
    to: "",
  });

  useEffect(() => {
    fetch("/api/public/settings")
      .then((r) => r.json())
      .then(
        (d) =>
          d &&
          setBizInfo({ businessName: d.businessName, currency: d.currency }),
      );
  }, []);

  useEffect(() => {
    fetch("/api/me")
      .then((r) => {
        if (r.status === 401) {
          router.push("/login");
          return null;
        }
        return r.json();
      })
      .then((d) => d && setRole(d.role));
  }, [router]);

  useEffect(() => {
    if (!role) return;
    if (role !== "CASHIER") {
      fetch("/api/admin/cashiers")
        .then((r) => r.json())
        .then((d) =>
          setCashiers(
            (d.cashiers ?? []).filter((c: any) => c.role === "CASHIER"),
          ),
        );
      fetch("/api/admin/business-day")
        .then((r) => r.json())
        .then((d) => {
          const days = [...(d.recentDays ?? [])];
          if (d.active) days.unshift(d.active);
          setBusinessDays(days);
        });
    }
    loadOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role]);

  function loadOrders() {
    const params = new URLSearchParams();
    if (role !== "CASHIER") {
      if (filters.businessDayId)
        params.set("businessDayId", filters.businessDayId);
      if (filters.cashierId) params.set("cashierId", filters.cashierId);
      if (filters.paymentMethod)
        params.set("paymentMethod", filters.paymentMethod);
      if (filters.status) params.set("status", filters.status);
      if (filters.from) params.set("from", filters.from);
      if (filters.to) params.set("to", filters.to);
    }

    fetch(`/api/orders?${params.toString()}`)
      .then((r) => r.json())
      .then((d) => setOrders(d.orders ?? []));
  }

  useEffect(() => {
    if (role && role !== "CASHIER") loadOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  async function updateStatus(order: OrderRow, status: string) {
    if (status === "REFUNDED") {
      const reason = prompt("Refund reason?");
      if (reason === null) return;
      await fetch(`/api/orders/${order.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, refundReason: reason }),
      });
    } else {
      await fetch(`/api/orders/${order.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
    }
    loadOrders();
  }

  async function deleteOrder(order: OrderRow) {
    if (
      !confirm(
        `Are you sure you want to COMPLETELY DELETE order #${order.orderNumber}? This will restore stock and erase the record.`,
      )
    )
      return;
    await fetch(`/api/orders/${order.id}`, { method: "DELETE" });
    loadOrders();
  }

  function printOrder(o: OrderRow) {
    setReceipt({
      orderNumber: o.orderNumber,
      businessName: bizInfo.businessName,
      currency: bizInfo.currency,
      items: o.items.map((i) => ({
        name: i.product.name,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        lineTotal: i.lineTotal,
        isBundle: i.product.isBundle,
        subItems: i.subItems.map((sub) => ({
          quantity: sub.quantity,
          name: sub.product.name,
          note: sub.note,
        })),
      })),
      subtotal: o.subtotal,
      deliveryFee: o.deliveryFee,
      discountLabel: o.discountLabel,
      discountAmount: o.discountAmount,
      total: o.total,
      orderType: o.orderType as "PICKUP" | "DELIVERY",
      paymentMethod: o.paymentMethod ?? "CASH",
      customerName: o.customerName ?? undefined,
      customerPhone: o.customerPhone ?? undefined,
      createdAt: o.createdAt,
      notes: o.notes ?? undefined,
    });
    setTimeout(() => window.print(), 100);
  }

  if (!role) return null;

  const canMutate = role === "ADMIN" || role === "CASHIER";
  const canRefund = role === "ADMIN";

  return (
    <div className="min-h-screen bg-panel">
      <div className="max-w-5xl mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl">Order History</h1>
            <p className="text-muted text-sm">
              {role === "CASHIER"
                ? "Orders from the current business day"
                : "Full order history — filter across all business days"}
            </p>
          </div>
          <button
            onClick={() => router.push(role === "CASHIER" ? "/pos" : "/admin")}
            className="px-4 py-2 rounded-full border border-line text-sm"
          >
            ← Back
          </button>
        </div>

        {role !== "CASHIER" && (
          <div className="bg-card border border-line rounded-2xl p-4 flex flex-wrap gap-3">
            <select
              value={filters.businessDayId}
              onChange={(e) =>
                setFilters({ ...filters, businessDayId: e.target.value })
              }
              className="px-3 py-2 rounded-lg border border-line text-sm bg-white"
            >
              <option value="">All business days</option>
              {businessDays.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.label}
                </option>
              ))}
            </select>
            <select
              value={filters.cashierId}
              onChange={(e) =>
                setFilters({ ...filters, cashierId: e.target.value })
              }
              className="px-3 py-2 rounded-lg border border-line text-sm bg-white"
            >
              <option value="">All cashiers</option>
              {cashiers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <select
              value={filters.paymentMethod}
              onChange={(e) =>
                setFilters({ ...filters, paymentMethod: e.target.value })
              }
              className="px-3 py-2 rounded-lg border border-line text-sm bg-white"
            >
              <option value="">All payment methods</option>
              {PAYMENT_METHODS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
            <select
              value={filters.status}
              onChange={(e) =>
                setFilters({ ...filters, status: e.target.value })
              }
              className="px-3 py-2 rounded-lg border border-line text-sm bg-white"
            >
              <option value="">All statuses</option>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <input
              type="date"
              value={filters.from}
              onChange={(e) => setFilters({ ...filters, from: e.target.value })}
              className="px-3 py-2 rounded-lg border border-line text-sm"
            />
            <input
              type="date"
              value={filters.to}
              onChange={(e) => setFilters({ ...filters, to: e.target.value })}
              className="px-3 py-2 rounded-lg border border-line text-sm"
            />
          </div>
        )}

        <div className="bg-card border border-line rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-panel text-muted text-xs uppercase tracking-wide">
              <tr>
                <th className="text-left px-4 py-3">#</th>
                <th className="text-left px-4 py-3">Time</th>
                <th className="text-left px-4 py-3">Cashier</th>
                <th className="text-left px-4 py-3">Type</th>
                <th className="text-left px-4 py-3">Payment</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-right px-4 py-3">Total</th>
                <th className="text-right px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <Fragment key={o.id}>
                  <tr className="border-t border-line hover:bg-gray-50 transition">
                    <td className="px-4 py-3 font-mono">#{o.orderNumber}</td>
                    <td className="px-4 py-3 text-xs text-muted">
                      {new Date(o.createdAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">{o.cashier.name}</td>
                    <td className="px-4 py-3 text-xs">{o.orderType}</td>
                    <td className="px-4 py-3 text-xs">{o.paymentMethod}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                          STATUS_COLORS[o.status] ?? "bg-muted/10 text-muted"
                        }`}
                      >
                        {o.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono">
                      {o.total.toFixed(0)}
                    </td>
                    <td className="px-4 py-3 text-right space-x-3 whitespace-nowrap">
                      <button
                        onClick={() =>
                          setExpanded(expanded === o.id ? null : o.id)
                        }
                        className="text-ink text-xs font-semibold"
                      >
                        {expanded === o.id ? "Hide" : "Details"}
                      </button>
                      <button
                        onClick={() => printOrder(o)}
                        className="text-ink text-xs font-semibold"
                      >
                        Print
                      </button>
                      {canMutate && ["PAID", "READY"].includes(o.status) && (
                        <button
                          onClick={() => setEditOrder(o)}
                          className="text-fire-dark text-xs font-semibold"
                        >
                          Edit
                        </button>
                      )}
                      {canMutate && o.status === "PAID" && (
                        <button
                          onClick={() => updateStatus(o, "READY")}
                          className="text-success text-xs font-semibold"
                        >
                          Ready
                        </button>
                      )}
                      {canMutate && o.status === "READY" && (
                        <button
                          onClick={() => updateStatus(o, "COMPLETED")}
                          className="text-success text-xs font-semibold"
                        >
                          Complete
                        </button>
                      )}
                      {canRefund &&
                        ["PAID", "READY", "COMPLETED"].includes(o.status) && (
                          <button
                            onClick={() => updateStatus(o, "REFUNDED")}
                            className="text-fire-dark text-xs font-semibold"
                          >
                            Refund
                          </button>
                        )}
                      {role === "ADMIN" && (
                        <button
                          onClick={() => deleteOrder(o)}
                          className="text-red-600 text-xs font-bold ml-2"
                        >
                          Delete
                        </button>
                      )}
                    </td>
                  </tr>
                  {expanded === o.id && (
                    <tr className="bg-panel/50">
                      <td colSpan={8} className="px-4 py-4">
                        <ul className="text-xs text-muted space-y-1 mb-2">
                          {o.items.map((i) => (
                            <li key={i.id}>
                              {i.quantity}x {i.product.name} —{" "}
                              {i.lineTotal.toFixed(2)} EGP
                              {i.subItems.length > 0 && (
                                <ul className="pl-4 mt-1 space-y-0.5 border-l-2 border-line">
                                  {i.subItems.map((si) => (
                                    <li key={si.id}>
                                      – {si.quantity}x {si.product.name}
                                      {si.note && (
                                        <span className="italic">
                                          {" "}
                                          ({si.note})
                                        </span>
                                      )}
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </li>
                          ))}
                        </ul>
                        {o.notes && (
                          <div className="mb-3 px-3 py-2 rounded-lg bg-yellow-50 text-xs text-yellow-800 font-medium border border-yellow-200">
                            📝 {o.notes}
                          </div>
                        )}
                        <div className="text-xs text-muted space-y-1 border-t border-line/50 pt-2">
                          <p>Subtotal: {o.subtotal.toFixed(2)} EGP</p>
                          {o.deliveryFee > 0 && (
                            <p>Delivery fee: {o.deliveryFee.toFixed(2)} EGP</p>
                          )}
                          {o.discountAmount > 0 && (
                            <p>
                              {o.discountLabel}: -{o.discountAmount.toFixed(2)}{" "}
                              EGP
                            </p>
                          )}
                          {o.customerName && (
                            <p className="font-medium text-ink">
                              Customer: {o.customerName}{" "}
                              {o.customerPhone ? `(${o.customerPhone})` : ""}
                            </p>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
              {orders.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-muted">
                    No orders found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {receipt && <ReceiptPrint order={receipt} />}

      {editOrder && (
        <Modal
          title={`Edit Order #${editOrder.orderNumber}`}
          onClose={() => setEditOrder(null)}
        >
          <EditOrderForm
            order={editOrder}
            onSaved={() => {
              setEditOrder(null);
              loadOrders();
            }}
          />
        </Modal>
      )}
    </div>
  );
}

function EditOrderForm({
  order,
  onSaved,
}: {
  order: OrderRow;
  onSaved: () => void;
}) {
  const [notes, setNotes] = useState(order.notes ?? "");
  const [customerName, setCustomerName] = useState(order.customerName ?? "");
  const [orderType, setOrderType] = useState(order.orderType);
  const [discountLabel, setDiscountLabel] = useState(order.discountLabel ?? "");
  const [customAmount, setCustomAmount] = useState(
    String(order.discountAmount || ""),
  );

  // Editable items state initialized from existing order items
  const [editableItems, setEditableItems] = useState<
    Array<{
      productId: string;
      name: string;
      quantity: number;
      unitPrice: number;
    }>
  >(
    order.items.map((i) => ({
      productId: i.productId,
      name: i.product.name,
      quantity: i.quantity,
      unitPrice: i.unitPrice,
    })),
  );

  // Available products list for adding new items
  const [allProducts, setAllProducts] = useState<
    Array<{ id: string; name: string; price: number }>
  >([]);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/products")
      .then((r) => r.json())
      .then((data) => {
        if (data?.categories) {
          const flattened = data.categories.flatMap((c: any) => c.products);
          setAllProducts(flattened);
        }
      });
  }, []);

  function updateQuantity(index: number, delta: number) {
    setEditableItems((prev) => {
      const next = [...prev];
      const newQty = next[index].quantity + delta;
      if (newQty <= 0) {
        return next.filter((_, idx) => idx !== index);
      }
      next[index] = { ...next[index], quantity: newQty };
      return next;
    });
  }

  function addProductToOrder() {
    if (!selectedProductId) return;
    const productToAdd = allProducts.find((p) => p.id === selectedProductId);
    if (!productToAdd) return;

    setEditableItems((prev) => {
      const existingIdx = prev.findIndex(
        (i) => i.productId === productToAdd.id,
      );
      if (existingIdx >= 0) {
        const next = [...prev];
        next[existingIdx] = {
          ...next[existingIdx],
          quantity: next[existingIdx].quantity + 1,
        };
        return next;
      }
      return [
        ...prev,
        {
          productId: productToAdd.id,
          name: productToAdd.name,
          quantity: 1,
          unitPrice: productToAdd.price,
        },
      ];
    });
    setSelectedProductId("");
  }

  async function save() {
    setSaving(true);
    await fetch(`/api/orders/${order.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        edit: true,
        notes,
        customerName,
        orderType,
        discountLabel,
        customDiscountAmount: Number(customAmount) || 0,
        items: editableItems.map((i) => ({
          productId: i.productId,
          quantity: i.quantity,
        })),
      }),
    });
    setSaving(false);
    onSaved();
  }

  return (
    <div className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
      <div>
        <label className="text-xs text-muted font-medium mb-1 block">
          Customer name
        </label>
        <input
          value={customerName}
          onChange={(e) => setCustomerName(e.target.value)}
          placeholder="Customer name"
          className="w-full px-3 py-2 rounded-lg border border-line text-sm bg-card"
        />
      </div>

      <div>
        <label className="text-xs text-muted font-medium mb-1 block">
          Order type
        </label>
        <select
          value={orderType}
          onChange={(e) => setOrderType(e.target.value as any)}
          className="w-full px-3 py-2 rounded-lg border border-line text-sm bg-card"
        >
          <option value="PICKUP">Pickup</option>
          <option value="DELIVERY">Delivery</option>
        </select>
      </div>

      {/* Items Section (Edit, Delete, and Add New) */}
      <div className="space-y-2">
        <label className="text-xs text-muted font-medium block">
          Order Items
        </label>

        {/* Add new item control */}
        <div className="flex gap-2">
          <select
            value={selectedProductId}
            onChange={(e) => setSelectedProductId(e.target.value)}
            className="flex-1 px-3 py-2 rounded-lg border border-line text-sm bg-card"
          >
            <option value="">Select product to add...</option>
            {allProducts.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.price} EGP)
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={addProductToOrder}
            disabled={!selectedProductId}
            className="px-4 py-2 rounded-lg bg-ink text-panel text-sm font-semibold disabled:opacity-30"
          >
            Add
          </button>
        </div>

        {/* List of current order items */}
        <div className="border border-line rounded-xl p-3 space-y-2 bg-panel">
          {editableItems.length === 0 && (
            <p className="text-xs text-muted text-center py-2">
              No items in order.
            </p>
          )}
          {editableItems.map((item, idx) => (
            <div
              key={item.productId}
              className="flex items-center justify-between text-sm bg-card p-2 rounded-lg border border-line"
            >
              <div className="flex-1 truncate pr-2">
                <span className="font-medium">{item.name}</span>
                <span className="text-xs text-muted block">
                  {item.unitPrice} EGP each
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => updateQuantity(idx, -1)}
                  className="w-7 h-7 rounded-lg border border-line flex items-center justify-center font-bold hover:bg-panel"
                >
                  -
                </button>
                <span className="w-6 text-center font-mono text-sm">
                  {item.quantity}
                </span>
                <button
                  type="button"
                  onClick={() => updateQuantity(idx, 1)}
                  className="w-7 h-7 rounded-lg border border-line flex items-center justify-center font-bold hover:bg-panel"
                >
                  +
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <label className="text-xs text-muted font-medium mb-1 block">
          Discount
        </label>
        <select
          value={discountLabel}
          onChange={(e) => setDiscountLabel(e.target.value)}
          className="w-full px-3 py-2 rounded-lg border border-line text-sm bg-card"
        >
          <option value="">No discount</option>
          <option value="Owner (10% Off)">Owner (10% Off)</option>
          <option value="Staff (25% Off)">Staff (25% Off)</option>
          <option value="Custom Amount">Custom Amount</option>
        </select>
      </div>

      {discountLabel === "Custom Amount" && (
        <div>
          <label className="text-xs text-muted font-medium mb-1 block">
            Custom discount amount
          </label>
          <input
            value={customAmount}
            onChange={(e) => setCustomAmount(e.target.value)}
            type="number"
            placeholder="EGP off"
            className="w-full px-3 py-2 rounded-lg border border-line text-sm font-mono bg-card"
          />
        </div>
      )}

      <div>
        <label className="text-xs text-muted font-medium mb-1 block">
          Order notes
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          placeholder="Order notes"
          className="w-full px-3 py-2 rounded-lg border border-line text-sm bg-card"
        />
      </div>

      <button
        onClick={save}
        disabled={saving || editableItems.length === 0}
        className="w-full py-3 rounded-xl bg-fire text-white font-semibold disabled:opacity-30"
      >
        {saving ? "Saving…" : "Save changes"}
      </button>
    </div>
  );
}
