import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminSession, getDashboardSession } from "@/lib/session";

export async function GET() {
  const session = await getDashboardSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const products = await prisma.product.findMany({
    orderBy: { name: "asc" },
    include: {
      category: true,
      recipe: { include: { ingredient: true } },
    },
  });

  return NextResponse.json({ products });
}

type RecipeLineInput = { ingredientId: string; quantityUsed: number };

export async function POST(req: NextRequest) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { name, price, categoryId, recipe } = body as {
    name: string;
    price: number;
    categoryId?: string;
    recipe: RecipeLineInput[];
  };

  if (!name || price === undefined) {
    return NextResponse.json({ error: "Name and price are required" }, { status: 400 });
  }

  const product = await prisma.product.create({
    data: {
      name,
      price: Number(price),
      categoryId: categoryId || null,
      recipe: {
        create: (recipe ?? [])
          .filter((l) => l.ingredientId && l.quantityUsed > 0)
          .map((l) => ({ ingredientId: l.ingredientId, quantityUsed: Number(l.quantityUsed) })),
      },
    },
    include: { recipe: { include: { ingredient: true } } },
  });

  return NextResponse.json({ product });
}
