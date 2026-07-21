import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminSession, getDashboardSession } from "@/lib/session";

export async function GET() {
  const session = await getDashboardSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const settings = await prisma.appSettings.upsert({
    where: { id: "singleton" },
    update: {},
    create: { id: "singleton" },
  });

  // Never return secret values themselves — only whether they're configured.
  // Actual values must be set in Vercel Project Settings > Environment
  // Variables, not editable from inside the deployed app for security.
  const integrations = {
    wasenderConfigured: Boolean(process.env.WASENDER_API_KEY),
    databaseConfigured: Boolean(process.env.DATABASE_URL),
    cronSecretConfigured: Boolean(process.env.CRON_SECRET),
    appUrl: process.env.APP_URL ?? null,
  };

  return NextResponse.json({ settings, integrations });
}

export async function PATCH(req: NextRequest) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { businessName, currency, reviewDelayMinutes, defaultLowStockThreshold, deliveryFee } = body;

  const data: Record<string, unknown> = {};
  if (typeof businessName === "string") data.businessName = businessName;
  if (typeof currency === "string") data.currency = currency;
  if (reviewDelayMinutes !== undefined) data.reviewDelayMinutes = Number(reviewDelayMinutes);
  if (defaultLowStockThreshold !== undefined)
    data.defaultLowStockThreshold = Number(defaultLowStockThreshold);
  if (deliveryFee !== undefined) data.deliveryFee = Number(deliveryFee);

  const settings = await prisma.appSettings.upsert({
    where: { id: "singleton" },
    update: data,
    create: { id: "singleton", ...data },
  });

  return NextResponse.json({ settings });
}
