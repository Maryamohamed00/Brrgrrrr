import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { getActiveBusinessDay } from "@/lib/businessDay";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session || (session.role !== "ADMIN" && session.role !== "VIEWER")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const expenses = await prisma.expense.findMany({
    orderBy: { date: "desc" },
    take: 200,
  });

  return NextResponse.json({ expenses });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { category, description, amount, date } = await req.json();
  if (!category || !description || amount === undefined) {
    return NextResponse.json(
      { error: "Category, description, and amount are required" },
      { status: 400 }
    );
  }

  const activeDay = await getActiveBusinessDay();

  const expense = await prisma.expense.create({
    data: {
      category,
      description,
      amount: Number(amount),
      date: date ? new Date(date) : new Date(),
      businessDayId: activeDay?.id,
    },
  });

  return NextResponse.json({ expense });
}