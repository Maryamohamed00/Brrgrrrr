import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { decrementStockForOrder } from "@/lib/stock";
import { getActiveBusinessDay } from "@/lib/businessDay";
import { sendWhatsAppMessage, buildOrderReceiptMessage } from "@/lib/wasender";

// Update this type
type CartItem = { 
  productId: string; 
  quantity: number; 
  subItems?: { productId: string; quantity: number; note: string }[]; 
};

const DISCOUNT_RATES: Record<string, number> = {
  "Owner (10% Off)": 0.1,
  "Staff (25% Off)": 0.25,
};

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const where: Record<string, unknown> = {};

  if (session.role === "CASHIER") {
    // Cashiers see every order placed during the currently active business
    // day (not just their own), so the register can look up a customer's
    // order from earlier in the day regardless of who rang it up.
    const activeDay = await getActiveBusinessDay();
    where.businessDayId = activeDay?.id ?? "__none__";
  } else {
    // Admin/viewer: full historic access with optional filters.
    const businessDayId = searchParams.get("businessDayId");
    const cashierId = searchParams.get("cashierId");
    const paymentMethod = searchParams.get("paymentMethod");
    const status = searchParams.get("status");
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    if (businessDayId) where.businessDayId = businessDayId;
    if (cashierId) where.cashierId = cashierId;
    if (paymentMethod) where.paymentMethod = paymentMethod;
    if (status) where.status = status;
    if (from || to) {
      where.createdAt = {
        ...(from ? { gte: new Date(from) } : {}),
        ...(to ? { lte: new Date(to) } : {}),
      };
    }
  }

  const orders = await prisma.order.findMany({
    where,
    include: {
    items: { include: { product: true, subItems: { include: { product: true } } } },
    cashier: { select: { name: true } },
    businessDay: { select: { label: true } },
  },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return NextResponse.json({ orders });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || (session.role !== "CASHIER" && session.role !== "ADMIN") || !session.shiftId) {
  return NextResponse.json({ error: "Only an active cashier shift or Admin can check out orders" }, { status: 401 });
}

  const activeDay = await getActiveBusinessDay();
  if (!activeDay) {
    return NextResponse.json(
      { error: "No business day is open. Ask an admin to start the day before taking orders." },
      { status: 400 }
    );
  }

  const body = await req.json();
  const items: CartItem[] = body.items ?? [];
  const paymentMethod = body.paymentMethod as
    | "CASH"
    | "VODAFONE_CASH"
    | "INSTAPAY"
    | "CREDIT_CARD"
    | "TELDA"
    | undefined;
  const customerPhone: string | undefined = body.customerPhone || undefined;
  const customerName: string | undefined = body.customerName || undefined;
  const orderType: "PICKUP" | "DELIVERY" = body.orderType === "DELIVERY" ? "DELIVERY" : "PICKUP";
  const discountLabel: string | undefined = body.discountLabel || undefined;
  const customDiscountAmount: number = Number(body.customDiscountAmount) || 0;
  const notes: string | undefined = body.notes || undefined;

  if (!items.length) {
    return NextResponse.json({ error: "Cart is empty" }, { status: 400 });
  }
  if (!paymentMethod) {
    return NextResponse.json({ error: "Payment method is required" }, { status: 400 });
  }

  const products = await prisma.product.findMany({
    where: { id: { in: items.map((i) => i.productId) } },
  });
  const productMap = new Map(products.map((p) => [p.id, p]));

  for (const item of items) {
    if (!productMap.has(item.productId)) {
      return NextResponse.json({ error: `Unknown product: ${item.productId}` }, { status: 400 });
    }
  }

  const lineItems = items.map((item) => {
    const product = productMap.get(item.productId)!;
    const lineTotal = product.price * item.quantity;
    return {
      productId: item.productId,
      quantity: item.quantity,
      unitPrice: product.price,
      lineTotal,
    subItems: item.subItems 
      ? { create: item.subItems.map(sub => ({ productId: sub.productId, quantity: sub.quantity, note: sub.note })) }
      : undefined
    };
  });
  const subtotal = lineItems.reduce((sum, l) => sum + l.lineTotal, 0);

  const settings = await prisma.appSettings.upsert({
    where: { id: "singleton" },
    update: {},
    create: { id: "singleton" },
  });
  const deliveryFee = orderType === "DELIVERY" ? settings.deliveryFee : 0;

  let discountAmount = 0;
  if (discountLabel === "Custom Amount") {
    discountAmount = Math.max(0, Math.min(customDiscountAmount, subtotal));
  } else if (discountLabel && DISCOUNT_RATES[discountLabel]) {
    discountAmount = subtotal * DISCOUNT_RATES[discountLabel];
  }

  const total = Math.max(0, subtotal - discountAmount + deliveryFee);

  try {
    const result = await prisma.$transaction(async (tx) => {
      // Customer CRM: link by phone, create if new, bump stats.
      let customerId: string | undefined;
      if (customerPhone) {
        const customer = await tx.customer.upsert({
          where: { phone: customerPhone },
          update: {
            name: customerName || undefined,
            totalOrders: { increment: 1 },
            totalSpent: { increment: total },
          },
          create: {
            phone: customerPhone,
            name: customerName || "Guest",
            totalOrders: 1,
            totalSpent: total,
          },
        });
        customerId = customer.id;
      }

      const order = await tx.order.create({
        data: {
          cashierId: session.cashierId,
          shiftId: session.shiftId!,
          businessDayId: activeDay.id,
          status: "PAID",
          paymentMethod,
          orderType,
          deliveryFee,
          discountLabel: discountAmount > 0 ? discountLabel : null,
          discountAmount,
          subtotal,
          total,
          customerId,
          customerPhone,
          customerName,
          notes,
          paidAt: new Date(),
          items: { create: lineItems },
        },
        // UPDATE THIS INCLUDE BLOCK:
  include: {
    items: {
      include: {
        product: true,
        subItems: {
          include: { product: true } // This fetches the sub-item product names
        }
      }
    }
  },
});

      const warnings = await decrementStockForOrder(
        tx,
        order.id,
        items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
        activeDay.id
      );

      return { order, warnings };
    });

    // Review scheduling + WhatsApp receipt are best-effort side effects, not
    // part of the order/stock atomicity — running them after commit instead
    // of inside the transaction keeps the transaction (and the DB lock time)
    // as short as possible.
    if (customerPhone) {
      prisma.pendingReview
        .create({
          data: {
            orderId: result.order.id,
            phone: customerPhone,
            sendAt: new Date(Date.now() + settings.reviewDelayMinutes * 60 * 1000),
          },
        })
        .catch((err) => console.error("[checkout] pending review schedule failed", err));
    }

    // WhatsApp order-confirmation receipt (mocked until WASENDER_API_KEY is set).
    if (customerPhone) {
      const receiptMessage = buildOrderReceiptMessage({
        orderNumber: result.order.orderNumber,
        businessName: settings.businessName,
        items: result.order.items.map((i) => ({
          name: i.product.name,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          lineTotal: i.lineTotal,
        })),
        subtotal,
        deliveryFee,
        discountLabel: discountAmount > 0 ? discountLabel ?? null : null,
        discountAmount,
        total,
        orderType,
        currency: settings.currency,
      });
      // Best-effort — a WhatsApp failure should never fail the checkout.
      sendWhatsAppMessage(customerPhone, receiptMessage).catch((err) =>
        console.error("[checkout] receipt WhatsApp send failed", err)
      );
    }

    return NextResponse.json({
      order: result.order,
      lowStockWarnings: result.warnings,
    });
  } catch (err) {
    console.error("[checkout] failed", err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      {
        error: "Checkout failed",
        // Temporary: surfaces the real Prisma/DB error so we can pin down the
        // cause. Safe to remove once this is stable in production.
        detail: message,
      },
      { status: 500 }
    );
  }
}