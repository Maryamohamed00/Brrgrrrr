import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const phone = new URL(req.url).searchParams.get("phone");
  if (!phone || phone.length < 6) {
    return NextResponse.json({ customer: null });
  }

  const customer = await prisma.customer.findUnique({ where: { phone } });
  return NextResponse.json({
    customer: customer
      ? {
          name: customer.name,
          totalOrders: customer.totalOrders,
          totalSpent: customer.totalSpent,
          isLoyal: customer.totalOrders > 5,
        }
      : null,
  });
}
