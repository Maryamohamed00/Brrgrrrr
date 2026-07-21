import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { getAdminSession, getDashboardSession } from "@/lib/session";

export async function GET() {
  const session = await getDashboardSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const cashiers = await prisma.cashier.findMany({
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      name: true,
      role: true,
      active: true,
      createdAt: true,
      _count: { select: { orders: true } },
    },
  });

  return NextResponse.json({ cashiers });
}

export async function POST(req: NextRequest) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name, pin, role } = await req.json();
  if (!name || !pin || pin.length < 4) {
    return NextResponse.json({ error: "Name and a 4+ digit PIN are required" }, { status: 400 });
  }

  const pinHash = await bcrypt.hash(pin, 10);
  const validRole = role === "ADMIN" || role === "VIEWER" ? role : "CASHIER";
  const cashier = await prisma.cashier.create({
    data: { name, pinHash, role: validRole },
  });

  return NextResponse.json({ cashier: { id: cashier.id, name: cashier.name, role: cashier.role } });
}
