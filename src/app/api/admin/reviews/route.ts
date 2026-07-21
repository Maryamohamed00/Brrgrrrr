import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getDashboardSession } from "@/lib/session";

export async function GET() {
  const session = await getDashboardSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const reviews = await prisma.review.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      order: {
        select: {
          orderNumber: true,
          customerName: true,
          customerPhone: true,
          cashier: { select: { name: true } },
        },
      },
    },
    take: 100,
  });

  const avgRating =
    reviews.reduce((sum, r) => sum + r.rating, 0) / (reviews.length || 1);

  return NextResponse.json({ reviews, avgRating, count: reviews.length });
}
