"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/pos/Header";
import ProductGrid, { Category, Product } from "@/components/pos/ProductGrid";
import Cart, { CartLine } from "@/components/pos/Cart";
import PaymentPicker, { CheckoutPayload } from "@/components/pos/PaymentPicker";
import ReceiptPrint, { ReceiptOrder } from "@/components/pos/ReceiptPrint";
import BusinessDayControl from "@/components/pos/BusinessDayControl";
import BundleModal from "@/components/pos/BundleModal";

const DISCOUNT_RATES: Record<string, number> = {
  "Owner (10% Off)": 0.1,
  "Staff (25% Off)": 0.25,
};

// Simple unique ID generator for cart lines
const generateId = () => Math.random().toString(36).substring(2, 9);

export default function PosPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const [charging, setCharging] = useState(false);
  const [cashierName, setCashierName] = useState("Cashier");
  const [businessDayLabel, setBusinessDayLabel] = useState<string | null>(null);
  const [businessName, setBusinessName] = useState("Counter");
  const [currency, setCurrency] = useState("EGP");
  const [deliveryFeeSetting, setDeliveryFeeSetting] = useState(20);
  const [lastReceipt, setLastReceipt] = useState<ReceiptOrder | null>(null);

  // Bundle Modal State
  const [bundleModalOpen, setBundleModalOpen] = useState(false);
  const [selectedBundle, setSelectedBundle] = useState<Product | null>(null);

  const [orderType, setOrderType] = useState<"PICKUP" | "DELIVERY">("PICKUP");
  const [discountLabel, setDiscountLabel] = useState("");
  const [customDiscountAmount, setCustomDiscountAmount] = useState(0);
  const [resetSignal, setResetSignal] = useState(0);

  const router = useRouter();

  useEffect(() => {
    fetch("/api/products")
      .then(async (res) => {
        if (res.status === 401) {
          router.push("/login");
          return null;
        }
        return res.json();
      })
      .then((data) => data && setCategories(data.categories));

    fetch("/api/me")
      .then((r) => r.json())
      .then((d) => d?.name && setCashierName(d.name));

    fetch("/api/public/settings")
      .then((r) => r.json())
      .then((d) => {
        if (d?.businessName) setBusinessName(d.businessName);
        if (d?.currency) setCurrency(d.currency);
        if (d?.deliveryFee !== undefined) setDeliveryFeeSetting(d.deliveryFee);
      });

    function loadBusinessDay() {
      fetch("/api/business-day/status")
        .then((r) => r.json())
        .then((d) => setBusinessDayLabel(d.active?.label ?? null));
    }
    loadBusinessDay();
    const id = setInterval(loadBusinessDay, 30000);
    return () => clearInterval(id);
  }, [router]);

  function refreshBusinessDay() {
    fetch("/api/business-day/status")
      .then((r) => r.json())
      .then((d) => setBusinessDayLabel(d.active?.label ?? null));
  }

  // Flattens all categories into a single array for the BundleModal to use
  const allProducts = categories.flatMap((c) => c.products);

  function handleProductClick(product: Product) {
    if (product.isBundle) {
      // It's a bundle! Open the customization modal.
      setSelectedBundle(product);
      setBundleModalOpen(true);
    } else {
      // Normal product. Add to cart immediately.
      setCart((prev) => {
        // Only group normal non-bundle items together
        const existingIdx = prev.findIndex(
          (l) => !l.isBundle && l.productId === product.id,
        );
        if (existingIdx >= 0) {
          const newCart = [...prev];
          newCart[existingIdx] = {
            ...newCart[existingIdx],
            quantity: newCart[existingIdx].quantity + 1,
          };
          return newCart;
        }
        return [
          ...prev,
          {
            lineId: generateId(),
            productId: product.id,
            name: product.name,
            price: product.price,
            quantity: 1,
            isBundle: false,
          },
        ];
      });
    }
  }

  function handleAddBundleToCart(bundleProduct: any, subItems: any[]) {
    setCart((prev) => [
      ...prev,
      {
        lineId: generateId(),
        productId: bundleProduct.id,
        name: bundleProduct.name,
        price: bundleProduct.price,
        quantity: 1,
        isBundle: true,
        subItems: subItems,
      },
    ]);
  }

  function increment(lineId: string) {
    setCart((prev) =>
      prev.map((l) =>
        l.lineId === lineId ? { ...l, quantity: l.quantity + 1 } : l,
      ),
    );
  }

  function decrement(lineId: string) {
    setCart((prev) =>
      prev
        .map((l) =>
          l.lineId === lineId ? { ...l, quantity: l.quantity - 1 } : l,
        )
        .filter((l) => l.quantity > 0),
    );
  }

  function remove(lineId: string) {
    setCart((prev) => prev.filter((l) => l.lineId !== lineId));
  }

  const subtotal = cart.reduce((sum, l) => sum + l.price * l.quantity, 0);
  const deliveryFeePreview = orderType === "DELIVERY" ? deliveryFeeSetting : 0;
  const discountAmountPreview =
    discountLabel === "Custom Amount"
      ? Math.max(0, Math.min(customDiscountAmount, subtotal))
      : discountLabel && DISCOUNT_RATES[discountLabel]
        ? subtotal * DISCOUNT_RATES[discountLabel]
        : 0;

  async function checkout(payload: CheckoutPayload) {
    if (!cart.length) return;
    setCharging(true);
    setToast(null);

    const res = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: cart.map((l) => ({
          productId: l.productId,
          quantity: l.quantity,
          subItems: l.subItems?.map((sub) => ({
            productId: sub.productId,
            quantity: sub.quantity,
            note: sub.note,
          })),
        })),
        paymentMethod: payload.method,
        customerPhone: payload.phone || undefined,
        customerName: payload.name || undefined,
        orderType: payload.orderType,
        discountLabel: payload.discountLabel || undefined,
        customDiscountAmount: payload.customDiscountAmount || undefined,
        notes: payload.notes || undefined,
      }),
    });

    const data = await res.json();
    console.log("Order Data from API:", data.order);
    setCharging(false);

    if (!res.ok) {
      setToast(
        data.detail
          ? `${data.error}: ${data.detail}`
          : (data.error ?? "Checkout failed"),
      );
      return;
    }

    setCart([]);
    setDiscountLabel("");
    setCustomDiscountAmount(0);
    setOrderType("PICKUP");
    setResetSignal((n) => n + 1);

    setLastReceipt({
      orderNumber: data.order.orderNumber,
      businessName,
      currency,
      items: data.order.items.map((i: any) => ({
        name: i.product.name,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        lineTotal: i.lineTotal,
        isBundle: i.product.isBundle,
        subItems: i.subItems?.map((sub: any) => ({
          quantity: sub.quantity,
          name: sub.product.name,
          note: sub.note,
        })),
      })),
      subtotal: data.order.subtotal,
      deliveryFee: data.order.deliveryFee,
      discountLabel: data.order.discountLabel,
      discountAmount: data.order.discountAmount,
      total: data.order.total,
      orderType: data.order.orderType,
      paymentMethod: data.order.paymentMethod,
      customerName: data.order.customerName,
      customerPhone: data.order.customerPhone,
      createdAt: data.order.createdAt,
    });

    const warnings = data.lowStockWarnings as {
      name: string;
      remaining: number;
    }[];
    if (warnings?.length) {
      setToast(
        `Order #${data.order.orderNumber} placed. Low stock: ${warnings
          .map((w) => `${w.name} (${w.remaining} left)`)
          .join(", ")}`,
      );
    } else {
      setToast(`Order #${data.order.orderNumber} placed.`);
    }
  }

  return (
    <div className="h-screen flex flex-col">
      <Header cashierName={cashierName} businessDayLabel={businessDayLabel} />

      {!businessDayLabel && (
        <div className="px-6 py-3 bg-warning/10 border-b border-warning/30 text-sm flex items-center justify-center gap-3">
          <span>
            No business day is open yet — start one before taking orders.
          </span>
          <BusinessDayControl isOpen={false} onChanged={refreshBusinessDay} />
        </div>
      )}
      {businessDayLabel && (
        <div className="px-6 py-2 bg-success/5 border-b border-success/20 text-xs flex items-center justify-end">
          <BusinessDayControl isOpen={true} onChanged={refreshBusinessDay} />
        </div>
      )}

      <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-y-auto md:overflow-hidden">
        {/* Pass the updated click handler to the grid */}
        <div className="flex-1">
          <ProductGrid categories={categories} onAdd={handleProductClick} />
        </div>

        <aside className="w-full md:w-[380px] shrink-0 border-t md:border-t-0 md:border-l border-line flex flex-col bg-panel">
          <Cart
            lines={cart}
            deliveryFee={deliveryFeePreview}
            discountLabel={discountLabel || null}
            discountAmount={discountAmountPreview}
            onIncrement={increment}
            onDecrement={decrement}
            onRemove={remove}
          />
          <PaymentPicker
            disabled={!cart.length || charging || !businessDayLabel}
            onCheckout={checkout}
            onChange={(state) => {
              setOrderType(state.orderType);
              setDiscountLabel(state.discountLabel);
              setCustomDiscountAmount(state.customDiscountAmount);
            }}
            resetSignal={resetSignal}
          />
        </aside>
      </div>

      <BundleModal
        isOpen={bundleModalOpen}
        bundleProduct={selectedBundle}
        availableProducts={allProducts as any} // 'as any' bypasses the type mismatch for now
        onClose={() => setBundleModalOpen(false)}
        onAddToCart={(bundle, subItems) => {
          handleAddBundleToCart(bundle, subItems);
        }}
      />

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-ink text-panel px-6 py-3 rounded-full shadow-lg text-sm max-w-lg text-center flex items-center gap-3 z-50">
          <span>{toast}</span>
          {lastReceipt && (
            <button
              onClick={() => window.print()}
              className="px-3 py-1.5 rounded-full bg-fire text-white text-xs font-medium shrink-0 hover:bg-fire-dark transition"
            >
              Print Receipt
            </button>
          )}
          <button
            onClick={() => setToast(null)}
            className="text-muted text-xs shrink-0 hover:text-white transition"
          >
            ✕
          </button>
        </div>
      )}

      {lastReceipt && <ReceiptPrint order={lastReceipt} />}
    </div>
  );
}
