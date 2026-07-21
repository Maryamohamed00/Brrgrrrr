import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getDashboardSession } from "@/lib/session";

export async function GET(req: NextRequest) {
  const session = await getDashboardSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const days = Number(new URL(req.url).searchParams.get("days") ?? "30");
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const cashiers = await prisma.cashier.findMany({
    where: { role: "CASHIER" },
    include: {
      orders: {
        where: {
          createdAt: { gte: since },
          status: { in: ["PAID", "READY", "COMPLETED"] },
        },
        select: { total: true },
      },
      shifts: {
        where: { clockIn: { gte: since } },
        orderBy: { clockIn: "desc" },
        take: 20,
      },
    },
  });

  const rows = cashiers.map((c) => {
    const totalSales = c.orders.reduce((sum, o) => sum + o.total, 0);
    const orderCount = c.orders.length;
    const avgOrderValue = orderCount ? totalSales / orderCount : 0;

    const shiftDurationsMs = c.shifts
      .filter((s) => s.clockOut)
      .map((s) => new Date(s.clockOut!).getTime() - new Date(s.clockIn).getTime());
    const totalHours =
      shiftDurationsMs.reduce((sum, ms) => sum + ms, 0) / (1000 * 60 * 60);

    return {
      id: c.id,
      name: c.name,
      active: c.active,
      totalSales,
      orderCount,
      avgOrderValue,
      totalHours: Math.round(totalHours * 10) / 10,
      openShift: c.shifts.find((s) => !s.clockOut) ?? null,
      shifts: c.shifts.map((s) => ({
        id: s.id,
        clockIn: s.clockIn,
        clockOut: s.clockOut,
      })),
    };
  });

  rows.sort((a, b) => b.totalSales - a.totalSales);
  const bestPerformerId = rows[0]?.id ?? null;

  return NextResponse.json({ cashiers: rows, bestPerformerId });
}
