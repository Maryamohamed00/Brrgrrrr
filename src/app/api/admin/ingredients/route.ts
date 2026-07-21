import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminSession, getDashboardSession } from "@/lib/session";

export async function GET() {
  const session = await getDashboardSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const ingredients = await prisma.ingredient.findMany({
    orderBy: { name: "asc" },
  });

  return NextResponse.json({ ingredients });
}

export async function POST(req: NextRequest) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { name, unit, stockQty, lowStockThreshold, packSize, costPerUnit } = body;

  if (!name || !unit) {
    return NextResponse.json({ error: "Name and unit are required" }, { status: 400 });
  }

  const ingredient = await prisma.ingredient.create({
    data: {
      name,
      unit,
      stockQty: Number(stockQty) || 0,
      lowStockThreshold: Number(lowStockThreshold) || 0,
      packSize: packSize ? Number(packSize) : null,
      costPerUnit: Number(costPerUnit) || 0,
    },
  });

  return NextResponse.json({ ingredient });
}
