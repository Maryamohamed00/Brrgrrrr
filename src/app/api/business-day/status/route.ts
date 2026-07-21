import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getActiveBusinessDay } from "@/lib/businessDay";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const active = await getActiveBusinessDay();

  return NextResponse.json({
    active: active ? { id: active.id, label: active.label } : null,
  });
}
