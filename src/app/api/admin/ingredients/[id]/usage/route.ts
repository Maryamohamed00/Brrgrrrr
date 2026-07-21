import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/session";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const lines = await prisma.productIngredient.findMany({
    where: { ingredientId: params.id },
    include: { product: { select: { name: true, isBundle: true } } },
  });

  return NextResponse.json({
    products: lines.map((l) => ({ name: l.product.name, isBundle: l.product.isBundle })),
  });
}