import { Prisma, PrismaClient } from "@prisma/client";

type TxClient = Omit<
  PrismaClient,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
>;

export type LowStockWarning = {
  ingredientId: string;
  name: string;
  remaining: number;
  threshold: number;
};

export async function decrementStockForOrder(
  tx: TxClient,
  orderId: string,
  items: { productId: string; quantity: number; isBundle?: boolean; subItems?: any[] }[],
  businessDayId?: string
): Promise<LowStockWarning[]> {
  
  // 1. Flatten items
  const flatItems: { productId: string; quantity: number }[] = [];
  for (const item of items) {
    if (item.isBundle && item.subItems) {
      for (const sub of item.subItems) {
        flatItems.push({ productId: sub.productId, quantity: sub.quantity });
      }
    } else {
      flatItems.push({ productId: item.productId, quantity: item.quantity });
    }
  }

  // 2. Fetch ALL relevant recipes in ONE query, but only for products that have recipes
  const productIds = Array.from(new Set(flatItems.map((i) => i.productId)));
  const recipeLines = await tx.productIngredient.findMany({
    where: { productId: { in: productIds } },
    include: { ingredient: true }
  });

  if (recipeLines.length === 0) return [];

  // 3. Aggregate consumption
  const qtyByProduct = new Map<string, number>();
  for (const i of flatItems) {
    qtyByProduct.set(i.productId, (qtyByProduct.get(i.productId) ?? 0) + i.quantity);
  }

  const consumption = new Map<string, number>();
  for (const line of recipeLines) {
    const qty = qtyByProduct.get(line.productId) ?? 0;
    if (qty > 0) {
      consumption.set(
        line.ingredientId,
        (consumption.get(line.ingredientId) ?? 0) + (line.quantityUsed * qty)
      );
    }
  }

  // 4. Update sequentially to avoid transaction deadlocks
  const warnings: LowStockWarning[] = [];
  
  for (const [ingredientId, amountUsed] of consumption.entries()) {
    const ingredient = await tx.ingredient.update({
      where: { id: ingredientId },
      data: { stockQty: { decrement: amountUsed } },
    });

    await tx.stockMovement.create({
      data: {
        ingredientId,
        orderId,
        businessDayId,
        change: -amountUsed,
        reason: "SALE",
        resultingQty: ingredient.stockQty,
      },
    });

    if (ingredient.stockQty <= ingredient.lowStockThreshold) {
      warnings.push({
        ingredientId: ingredient.id,
        name: ingredient.name,
        remaining: ingredient.stockQty,
        threshold: ingredient.lowStockThreshold,
      });
    }
  }

  return warnings;
}

export async function restockForRefund(tx: TxClient, orderId: string, businessDayId?: string) {
  const movements = await tx.stockMovement.findMany({
    where: { orderId, reason: "SALE" },
  });
  for (const m of movements) {
    const ingredient = await tx.ingredient.update({
      where: { id: m.ingredientId },
      data: { stockQty: { increment: Math.abs(m.change) } },
    });
    await tx.stockMovement.create({
      data: {
        ingredientId: m.ingredientId,
        orderId,
        businessDayId,
        change: Math.abs(m.change),
        reason: "REFUND",
        resultingQty: ingredient.stockQty,
      },
    });
  }
}