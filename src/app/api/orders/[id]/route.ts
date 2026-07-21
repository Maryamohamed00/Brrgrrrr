import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, getAdminSession } from "@/lib/session";
import { restockForRefund } from "@/lib/stock";
import { sendWhatsAppMessage, buildOrderReadyMessage } from "@/lib/wasender";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { status, refundReason, edit, notes, customerName, customerPhone, orderType, discountLabel, customDiscountAmount, items } = body as {
    status?: "READY" | "COMPLETED" | "REFUNDED" | "CANCELLED";
    refundReason?: string;
    edit?: boolean;
    notes?: string;
    customerName?: string;
    customerPhone?: string;
    orderType?: "PICKUP" | "DELIVERY";
    discountLabel?: string;
    customDiscountAmount?: number;
    items?: Array<{
      productId: string;
      quantity: number;
      subItems?: Array<{ productId: string; quantity: number; note?: string | null }>;
    }>;
  };

  const order = await prisma.order.findUnique({ where: { id: params.id } });
  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

  if (session.role === "VIEWER") {
    return NextResponse.json({ error: "View-only access cannot change orders" }, { status: 403 });
  }

  // Handle Editing order metadata and items (with stock reconciliation)
  if (edit) {
    if (!["PAID", "READY"].includes(order.status)) {
      return NextResponse.json(
        { error: "Only orders that are still PAID or READY can be edited" },
        { status: 400 }
      );
    }

    const settings = await prisma.appSettings.upsert({ where: { id: "singleton" }, update: {}, create: { id: "singleton" } });

    const newOrderType = orderType === "DELIVERY" || orderType === "PICKUP" ? orderType : order.orderType;
    const deliveryFee = newOrderType === "DELIVERY" ? settings.deliveryFee : 0;

    const updated = await prisma.$transaction(async (tx) => {
      // 1. If new items are provided, handle stock adjustments and line item recreation
      let subtotal = order.subtotal;
      let newLineItems = undefined;

      if (items && Array.isArray(items)) {
        // Restock old items first
        await restockForRefund(tx, order.id, order.businessDayId);
        
        // Delete old sub-items and items
        await tx.orderItemSubItem.deleteMany({ where: { orderItem: { orderId: order.id } } });
        await tx.orderItem.deleteMany({ where: { orderId: order.id } });

        subtotal = 0;
        newLineItems = [];

        for (const it of items) {
          const product = await tx.product.findUnique({ where: { id: it.productId } });
          if (!product) throw new Error("Product not found");

          const lineTotal = product.price * it.quantity;
          subtotal += lineTotal;

          newLineItems.push({
            productId: it.productId,
            quantity: it.quantity,
            unitPrice: product.price,
            lineTotal,
            subItems: it.subItems?.length ? {
              create: it.subItems.map((sub) => ({
                productId: sub.productId,
                quantity: sub.quantity,
                note: sub.note ?? null,
              }))
            } : undefined,
          });

          // Deduct stock for the updated quantities
          const recipeLines = await tx.productIngredient.findMany({ where: { productId: it.productId } });
          for (const line of recipeLines) {
            const totalNeeded = line.quantityUsed * it.quantity;
            await tx.ingredient.update({
              where: { id: line.ingredientId },
              data: { stockQty: { decrement: totalNeeded } },
            });
            const latestIng = await tx.ingredient.findUnique({ where: { id: line.ingredientId } });
            await tx.stockMovement.create({
              data: {
                ingredientId: line.ingredientId,
                change: -totalNeeded,
                reason: "SALE",
                orderId: order.id,
                resultingQty: latestIng?.stockQty ?? 0,
              },
            });
          }
        }
      }

      const DISCOUNT_RATES: Record<string, number> = { "Owner (10% Off)": 0.1, "Staff (25% Off)": 0.25 };
      let discountAmount = order.discountAmount;
      let finalDiscountLabel: string | null = order.discountLabel;

      if (discountLabel !== undefined) {
        finalDiscountLabel = discountLabel || null;
        if (discountLabel === "Custom Amount") {
          discountAmount = Math.max(0, Math.min(Number(customDiscountAmount) || 0, subtotal));
        } else if (discountLabel && DISCOUNT_RATES[discountLabel]) {
          discountAmount = subtotal * DISCOUNT_RATES[discountLabel];
        } else {
          discountAmount = 0;
        }
      }

      const total = Math.max(0, subtotal - discountAmount + deliveryFee);

      return tx.order.update({
        where: { id: order.id },
        data: {
          notes: notes !== undefined ? notes : order.notes,
          customerName: customerName !== undefined ? customerName : order.customerName,
          customerPhone: customerPhone !== undefined ? customerPhone : order.customerPhone,
          orderType: newOrderType,
          deliveryFee,
          subtotal,
          discountLabel: discountAmount > 0 ? finalDiscountLabel : null,
          discountAmount,
          total,
          ...(newLineItems ? { items: { create: newLineItems } } : {}),
        },
        include: {
          items: {
            include: {
              product: true,
              subItems: { include: { product: true } },
            },
          },
        },
      });
    });

    return NextResponse.json({ order: updated });
  }

  if (status === "READY") {
    const updated = await prisma.order.update({
      where: { id: order.id },
      data: { status: "READY", readyAt: new Date() },
    });

    if (order.customerPhone) {
      await sendWhatsAppMessage(
        order.customerPhone,
        buildOrderReadyMessage(order.orderNumber)
      );
    }

    return NextResponse.json({ order: updated });
  }

  if (status === "COMPLETED") {
    const updated = await prisma.order.update({
      where: { id: order.id },
      data: { status: "COMPLETED", completedAt: new Date() },
    });
    return NextResponse.json({ order: updated });
  }

  if (status === "REFUNDED" || status === "CANCELLED") {
    const admin = await getAdminSession();
    if (!admin) {
      return NextResponse.json(
        { error: "Only an admin can refund or cancel an order" },
        { status: 403 }
      );
    }
  }

  if (status === "REFUNDED") {
    const updated = await prisma.$transaction(async (tx) => {
      await restockForRefund(tx, order.id, order.businessDayId);
      return tx.order.update({
        where: { id: order.id },
        data: {
          status: "REFUNDED",
          refundedAt: new Date(),
          refundReason: refundReason ?? "Not specified",
        },
      });
    });
    return NextResponse.json({ order: updated });
  }

  if (status === "CANCELLED") {
    const updated = await prisma.order.update({
      where: { id: order.id },
      data: { status: "CANCELLED" },
    });
    return NextResponse.json({ order: updated });
  }

  return NextResponse.json({ error: "Unsupported status transition" }, { status: 400 });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const order = await prisma.order.findUnique({ where: { id: params.id } });
  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

  await prisma.$transaction(async (tx) => {
    // 1. Restock ingredients if the order wasn't already refunded
    if (order.status !== "REFUNDED" && order.status !== "CANCELLED") {
      await restockForRefund(tx, order.id, order.businessDayId);
    }

    // 2. Reverse customer stats so their lifetime totals are accurate
    if (order.customerId) {
      await tx.customer.update({
        where: { id: order.customerId },
        data: {
          totalOrders: { decrement: 1 },
          totalSpent: { decrement: order.total },
        },
      });
    }

    // 3. Hard delete the order (Prisma automatically cascades and deletes the OrderItems)
    // and correctly sets StockMovement.orderId to null so history isn't lost.
    await tx.order.delete({ where: { id: order.id } });
  });

  return NextResponse.json({ ok: true });
}