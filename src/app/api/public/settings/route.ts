import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const settings = await prisma.appSettings.upsert({
    where: { id: "singleton" },
    update: {},
    create: { id: "singleton" },
  });

  return NextResponse.json({
    businessName: settings.businessName,
    currency: settings.currency,
    deliveryFee: settings.deliveryFee,
  });
}
