import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getDashboardSession } from "@/lib/session";

export async function GET(req: NextRequest) {
  const session = await getDashboardSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const days = Number(new URL(req.url).searchParams.get("days") ?? "14");
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const orders = await prisma.order.findMany({
    where: { createdAt: { gte: since } },
    include: { items: { include: { product: true } } },
  });

  const validOrders = orders.filter((o) =>
    ["PAID", "READY", "COMPLETED"].includes(o.status)
  );

  const dailyMap = new Map<string, number>();
  for (const o of validOrders) {
    const key = o.createdAt.toISOString().slice(0, 10);
    dailyMap.set(key, (dailyMap.get(key) ?? 0) + o.total);
  }
  const revenueTrend = Array.from(dailyMap.entries())
    .map(([date, total]) => ({ date, total }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const productQty = new Map<string, { name: string; qty: number; revenue: number }>();
  for (const o of validOrders) {
    for (const item of o.items) {
      const existing = productQty.get(item.productId) ?? {
        name: item.product.name,
        qty: 0,
        revenue: 0,
      };
      existing.qty += item.quantity;
      existing.revenue += item.lineTotal;
      productQty.set(item.productId, existing);
    }
  }
  const topProducts = Array.from(productQty.values())
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 8);

  const statusCounts: Record<string, number> = {};
  for (const o of orders) {
    statusCounts[o.status] = (statusCounts[o.status] ?? 0) + 1;
  }

  const ingredients = await prisma.ingredient.findMany();
  const lowStock = ingredients
    .filter((i) => i.stockQty <= i.lowStockThreshold)
    .map((i) => ({
      id: i.id,
      name: i.name,
      stockQty: i.stockQty,
      lowStockThreshold: i.lowStockThreshold,
      unit: i.unit,
    }));

  const revenue = validOrders.reduce((sum, o) => sum + o.total, 0);

  return NextResponse.json({
    revenue,
    orderCount: validOrders.length,
    revenueTrend,
    topProducts,
    statusCounts,
    lowStock,
  });
}
