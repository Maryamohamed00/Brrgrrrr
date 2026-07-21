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
  const { name, price, categoryId, recipe, isBundle } = body;

  // We use Prisma's nested writes to clear the old recipe and create the new one
  const updated = await prisma.product.update({
    where: { id: params.id },
    data: {
      name,
      price: Number(price),
      categoryId: categoryId || null,
      isBundle: isBundle || false,
      recipe: {
        deleteMany: {}, // This cleanly deletes the old recipe items
        create: recipe?.map((r: any) => ({
          ingredientId: r.ingredientId,
          quantityUsed: Number(r.quantityUsed),
        })) || [],
      },
    },
  });

  return NextResponse.json({ product: updated });
}

// DUPLICATE ROUTE
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const original = await prisma.product.findUnique({
    where: { id: params.id },
    include: { recipe: true },
  });

  if (!original) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  // Create a clone of the product with " (Copy)" appended to the name
  const duplicated = await prisma.product.create({
    data: {
      name: `${original.name} (Copy)`,
      price: original.price,
      active: true,
      isArchived: false,
      isBundle: original.isBundle,
      categoryId: original.categoryId,
      recipe: {
        create: original.recipe.map((r) => ({
          ingredientId: r.ingredientId,
          quantityUsed: r.quantityUsed,
        })),
      },
    },
  });

  return NextResponse.json({ product: duplicated });
}

// DELETE / ARCHIVE ROUTE
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Check if this product has already been sold in the past
  const orderCount = await prisma.orderItem.count({
    where: { productId: params.id },
  });

  if (orderCount > 0) {
    // If it has been sold, we safely archive it so old receipts don't break
    await prisma.product.update({
      where: { id: params.id },
      data: { active: false, isArchived: true },
    });
  } else {
    // If it's a brand new test item, we permanently delete it
    await prisma.product.delete({
      where: { id: params.id },
    });
  }

  return NextResponse.json({ ok: true });
}