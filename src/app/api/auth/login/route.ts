import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/session";

export async function POST(req: NextRequest) {
  const { pin } = await req.json();

  if (!pin || typeof pin !== "string") {
    return NextResponse.json({ error: "PIN is required" }, { status: 400 });
  }

  const cashiers = await prisma.cashier.findMany({ where: { active: true } });

  let matched = null;
  for (const c of cashiers) {
    if (await bcrypt.compare(pin, c.pinHash)) {
      matched = c;
      break;
    }
  }

  if (!matched) {
    return NextResponse.json({ error: "Incorrect PIN" }, { status: 401 });
  }

  // Only cashiers clock in/out of a Shift (used for hours-worked and
  // performance tracking). Admins/viewers just get a session.
  let shiftId: string | undefined = undefined;
  if (matched.role === "CASHIER") {
    let shift = await prisma.shift.findFirst({
      where: { cashierId: matched.id, clockOut: null },
      orderBy: { clockIn: "desc" },
    });
    if (!shift) {
      shift = await prisma.shift.create({ data: { cashierId: matched.id } });
    }
    shiftId = shift.id;
  }

  await createSession({
    cashierId: matched.id,
    name: matched.name,
    role: matched.role,
    shiftId,
  });

  return NextResponse.json({
    ok: true,
    cashier: { id: matched.id, name: matched.name, role: matched.role },
  });
}
