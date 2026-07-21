import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/session";

export async function GET(req: NextRequest) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const cashierId = searchParams.get("cashierId");
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");

  if (!cashierId) {
    return NextResponse.json({ error: "Missing cashierId parameter" }, { status: 400 });
  }

  // Set up the date filter if dates are provided from the dashboard
  const dateFilter: Record<string, Date> = {};
  if (startDate) dateFilter.gte = new Date(startDate);
  if (endDate) dateFilter.lte = new Date(endDate);

  const whereClause: Record<string, any> = {
    cashierId,
    // Only count orders that actually made money
    status: { in: ["PAID", "COMPLETED", "READY"] }, 
  };

  if (startDate || endDate) {
    whereClause.createdAt = dateFilter;
  }

  // Fetch all successful orders rung up by the Cafe Register
  const orders = await prisma.order.findMany({
    where: whereClause,
    select: {
      id: true,
      total: true,
      createdAt: true,
      orderNumber: true,
    },
    orderBy: { createdAt: "desc" },
  });

  // Calculate the 70/30 split!
  const totalGrossSales = orders.reduce((sum, order) => sum + order.total, 0);
  const myCut = totalGrossSales * 0.70;
  const cafeCut = totalGrossSales * 0.30;

  return NextResponse.json({
    totalGrossSales,
    myCut,
    cafeCut,
    orderCount: orders.length,
    orders,
  });
}