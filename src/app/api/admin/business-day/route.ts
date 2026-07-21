import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { buildBusinessDayLabel } from "@/lib/businessDay";

const PAYMENT_METHODS = ["CASH", "VODAFONE_CASH", "INSTAPAY", "CREDIT_CARD", "TELDA"] as const;

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const active = await prisma.businessDay.findFirst({
    where: { status: "OPEN" },
    orderBy: { startedAt: "desc" },
    include: { startedBy: { select: { name: true } } },
  });

  if (!active) {
    return NextResponse.json({ active: null });
  }

  const orders = await prisma.order.findMany({
    where: {
      businessDayId: active.id,
      status: { in: ["PAID", "READY", "COMPLETED"] },
    },
    select: { total: true, paymentMethod: true },
  });

  const breakdown: Record<string, number> = {};
  for (const method of PAYMENT_METHODS) breakdown[method] = 0;
  let total = 0;
  for (const o of orders) {
    total += o.total;
    if (o.paymentMethod) breakdown[o.paymentMethod] = (breakdown[o.paymentMethod] ?? 0) + o.total;
  }

  // Expenses paid out of the physical till reduce the cash actually sitting
  // in the drawer, even though they don't change sales revenue.
  const expenseTotal = await prisma.expense.aggregate({
    where: { businessDayId: active.id },
    _sum: { amount: true },
  });
  breakdown.CASH -= expenseTotal._sum?.amount ?? 0;

  const recentDays = await prisma.businessDay.findMany({
    where: { status: "CLOSED" },
    orderBy: { startedAt: "desc" },
    take: 10,
  });

  return NextResponse.json({
    active: {
      id: active.id,
      label: active.label,
      startedAt: active.startedAt,
      startedBy: active.startedBy.name,
    },
    breakdown,
    total,
    orderCount: orders.length,
    recentDays,
  });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role === "VIEWER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const existing = await prisma.businessDay.findFirst({ where: { status: "OPEN" } });
  if (existing) {
    return NextResponse.json(
      { error: `A business day ("${existing.label}") is already open. End it first.` },
      { status: 400 }
    );
  }

  const { openingCash } = await req.json().catch(() => ({ openingCash: undefined }));

  const day = await prisma.businessDay.create({
    data: {
      label: buildBusinessDayLabel(new Date()),
      startedById: session.cashierId,
      openingCash: openingCash !== undefined ? Number(openingCash) : null,
    },
  });

  return NextResponse.json({ businessDay: day });
}

export async function PATCH(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role === "VIEWER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const active = await prisma.businessDay.findFirst({ where: { status: "OPEN" } });
  if (!active) {
    return NextResponse.json({ error: "No business day is currently open." }, { status: 400 });
  }

  const { closingCash, notes } = await req.json().catch(() => ({}));

  const closed = await prisma.businessDay.update({
    where: { id: active.id },
    data: {
      status: "CLOSED",
      endedAt: new Date(),
      endedById: session.cashierId,
      closingCash: closingCash !== undefined ? Number(closingCash) : null,
      notes: notes || null,
    },
  });

  return NextResponse.json({ businessDay: closed });
}