import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  // 1. Fetch the data first
  const orders = await prisma.order.findMany({
    include: {
      items: {
        include: {
          product: { include: { category: true } }
        }
      }
    }
  });

  // 2. Find the Cafe category
  const cafeCategory = await prisma.category.findFirst({ where: { name: "Cafe" } });

  // 3. Calculate revenue
  const totalCafeRevenue = orders.reduce((sum: number, order: any) => {
    const cafeItemTotal = order.items
      .filter((item: any) => item.product?.categoryId === cafeCategory?.id)
      .reduce((s: number, i: any) => s + (i.lineTotal || 0), 0);
    return sum + cafeItemTotal;
  }, 0);

  // 4. Calculate the 70/30 split
  const myCut = totalCafeRevenue * 0.70;
  const cafeCut = totalCafeRevenue * 0.30;

  return NextResponse.json({
  totalCafeRevenue,
  myCut,
  cafeCut,
  // Ensure these are included if your frontend needs them!
  revenue: 0, // Fill with your calculation
  cogs: 0,
  expenseTotal: 0,
  profit: 0,
  paymentBreakdown: {}, // Make sure this is sent, even if empty
  dailyRevenue: [],
  // ... rest of your fields
});
}