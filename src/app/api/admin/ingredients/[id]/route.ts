import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/session";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { name, unit, lowStockThreshold, packSize, costPerUnit, restockBy, setStockQty } = body;

  const data: Record<string, unknown> = {};
  if (typeof name === "string") data.name = name;
  if (typeof unit === "string") data.unit = unit;
  if (lowStockThreshold !== undefined) data.lowStockThreshold = Number(lowStockThreshold);
  if (packSize !== undefined) data.packSize = packSize === null ? null : Number(packSize);
  if (costPerUnit !== undefined) data.costPerUnit = Number(costPerUnit);

  // Direct edit: set the exact stock number (not a delta), logged as ADJUSTMENT.
  if (setStockQty !== undefined) {
    const current = await prisma.ingredient.findUnique({ where: { id: params.id } });
    if (!current) return NextResponse.json({ error: "Ingredient not found" }, { status: 404 });

    const newQty = Number(setStockQty);
    const diff = newQty - current.stockQty;

    const ingredient = await prisma.$transaction(async (tx) => {
      const updated = await tx.ingredient.update({
        where: { id: params.id },
        data: { ...data, stockQty: newQty },
      });
      if (diff !== 0) {
        await tx.stockMovement.create({
          data: {
            ingredientId: params.id,
            change: diff,
            reason: "ADJUSTMENT",
            resultingQty: updated.stockQty,
          },
        });
      }
      return updated;
    });
    return NextResponse.json({ ingredient });
  }

  // restockBy: a positive amount added to stock, logged as a movement so it
  // shows up in usage/restock history alongside sale-driven decrements.
  if (restockBy && Number(restockBy) > 0) {
    const ingredient = await prisma.$transaction(async (tx) => {
      const updated = await tx.ingredient.update({
        where: { id: params.id },
        data: { ...data, stockQty: { increment: Number(restockBy) } },
      });
      await tx.stockMovement.create({
        data: {
          ingredientId: params.id,
          change: Number(restockBy),
          reason: "RESTOCK",
          resultingQty: updated.stockQty,
        },
      });
      return updated;
    });
    return NextResponse.json({ ingredient });
  }

  const ingredient = await prisma.ingredient.update({
    where: { id: params.id },
    data,
  });

  return NextResponse.json({ ingredient });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Clear stock movements and recipe links, then delete the ingredient itself.
  await prisma.$transaction(async (tx) => {
    await tx.stockMovement.deleteMany({ where: { ingredientId: params.id } });
    await tx.productIngredient.deleteMany({ where: { ingredientId: params.id } });
    await tx.ingredient.delete({ where: { id: params.id } });
  });

  return NextResponse.json({ ok: true });
}