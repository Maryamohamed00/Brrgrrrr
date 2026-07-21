import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const orderId = new URL(req.url).searchParams.get("orderId");
  if (!orderId) return NextResponse.json({ error: "orderId is required" }, { status: 400 });

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { orderNumber: true },
  });
  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

  const existing = await prisma.review.findUnique({ where: { orderId } });

  return NextResponse.json({
    orderNumber: order.orderNumber,
    alreadyReviewed: Boolean(existing),
  });
}

export async function POST(req: NextRequest) {
  const { orderId, rating, foodRating, serviceRating, comment } = await req.json();

  if (!orderId || !rating || rating < 1 || rating > 5) {
    return NextResponse.json({ error: "A valid order and rating are required" }, { status: 400 });
  }

  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  const existing = await prisma.review.findUnique({ where: { orderId } });
  if (existing) {
    return NextResponse.json({ error: "This order already has a review" }, { status: 409 });
  }

  const review = await prisma.review.create({
    data: {
      orderId,
      rating: Number(rating),
      foodRating: foodRating ? Number(foodRating) : null,
      serviceRating: serviceRating ? Number(serviceRating) : null,
      comment: comment || null,
    },
  });

  return NextResponse.json({ review });
}
