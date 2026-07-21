import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendWhatsAppMessage, buildReviewMessage } from "@/lib/wasender";

// Configured in vercel.json to run every minute. Vercel sends a
// CRON_SECRET-bearing request; we check it so this endpoint can't be hit by
// anyone else.
export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const due = await prisma.pendingReview.findMany({
    where: { sent: false, sendAt: { lte: new Date() } },
    include: { order: true },
    take: 50,
  });

  const results = [];
  for (const pending of due) {
    // TODO: swap this for the real, built review form URL once it exists.
    const reviewUrl = `${process.env.APP_URL ?? "https://your-app.vercel.app"}/review/${pending.orderId}`;
    const message = buildReviewMessage(pending.order.orderNumber, reviewUrl);
    const result = await sendWhatsAppMessage(pending.phone, message);

    if (result.ok) {
      await prisma.pendingReview.update({
        where: { id: pending.id },
        data: { sent: true, sentAt: new Date() },
      });
    }
    results.push({ orderId: pending.orderId, ...result });
  }

  return NextResponse.json({ processed: results.length, results });
}
