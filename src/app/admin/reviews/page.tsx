"use client";

import { useEffect, useState } from "react";
import StatCard from "@/components/admin/StatCard";

type Review = {
  id: string;
  rating: number;
  foodRating: number | null;
  serviceRating: number | null;
  comment: string | null;
  createdAt: string;
  order: {
    orderNumber: number;
    customerName: string | null;
    customerPhone: string | null;
    cashier: { name: string };
  };
};

function Stars({ n }: { n: number }) {
  return (
    <span className="text-warning">
      {"★".repeat(n)}
      <span className="text-line">{"★".repeat(5 - n)}</span>
    </span>
  );
}

export default function ReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [avgRating, setAvgRating] = useState(0);
  const [count, setCount] = useState(0);

  useEffect(() => {
    fetch("/api/admin/reviews")
      .then((r) => r.json())
      .then((d) => {
        setReviews(d.reviews ?? []);
        setAvgRating(d.avgRating ?? 0);
        setCount(d.count ?? 0);
      });
  }, []);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl">Reviews</h1>
        <p className="text-muted text-sm">Customer feedback, collected 10 minutes after checkout</p>
      </div>

      <div className="grid grid-cols-2 gap-4 max-w-md">
        <StatCard label="Average rating" value={avgRating.toFixed(1)} accent />
        <StatCard label="Total reviews" value={String(count)} />
      </div>

      <div className="space-y-3">
        {reviews.map((r) => (
          <div key={r.id} className="bg-card border border-line rounded-2xl p-5">
            <div className="flex items-center justify-between">
              <div>
                <Stars n={r.rating} />
                <span className="ml-2 text-sm text-muted">
                  Order #{r.order.orderNumber} · served by {r.order.cashier.name}
                </span>
              </div>
              <span className="text-xs text-muted">
                {new Date(r.createdAt).toLocaleDateString()}
              </span>
            </div>
            {r.comment && <p className="text-sm mt-3">{r.comment}</p>}
            {(r.foodRating || r.serviceRating) && (
              <div className="flex gap-4 mt-3 text-xs text-muted">
                {r.foodRating && <span>Food: {r.foodRating}/5</span>}
                {r.serviceRating && <span>Service: {r.serviceRating}/5</span>}
              </div>
            )}
          </div>
        ))}
        {reviews.length === 0 && (
          <p className="text-muted text-center py-12">No reviews yet.</p>
        )}
      </div>
    </div>
  );
}
