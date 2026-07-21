import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/session";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const data: Record<string, unknown> = {};

  if (typeof body.name === "string") data.name = body.name;
  if (body.role === "ADMIN" || body.role === "CASHIER" || body.role === "VIEWER") data.role = body.role;
  if (typeof body.active === "boolean") data.active = body.active;
  if (typeof body.pin === "string" && body.pin.length >= 4) {
    data.pinHash = await bcrypt.hash(body.pin, 10);
  }

  const cashier = await prisma.cashier.update({
    where: { id: params.id },
    data,
  });

  return NextResponse.json({
    cashier: { id: cashier.id, name: cashier.name, role: cashier.role, active: cashier.active },
  });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Soft-delete only — orders/shifts reference this cashier for history and
  // performance reporting, so we deactivate rather than hard-delete.
  await prisma.cashier.update({ where: { id: params.id }, data: { active: false } });

  return NextResponse.json({ ok: true });
}
