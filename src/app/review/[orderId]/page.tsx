"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

function StarPicker({
  value,
  onChange,
  label,
}: {
  value: number;
  onChange: (n: number) => void;
  label: string;
}) {
  return (
    <div>
      <p className="text-sm font-medium mb-2">{label}</p>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            className={`text-3xl leading-none transition-colors ${
              n <= value ? "text-warning" : "text-line"
            }`}
            aria-label={`${n} star${n > 1 ? "s" : ""}`}
          >
            ★
          </button>
        ))}
      </div>
    </div>
  );
}

export default function ReviewFormPage() {
  const params = useParams<{ orderId: string }>();
  const orderId = params.orderId;

  const [status, setStatus] = useState<"loading" | "ready" | "already" | "notfound" | "submitted">(
    "loading"
  );
  const [orderNumber, setOrderNumber] = useState<number | null>(null);

  const [rating, setRating] = useState(0);
  const [foodRating, setFoodRating] = useState(0);
  const [serviceRating, setServiceRating] = useState(0);
  const [comment, setComment] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch(`/api/reviews?orderId=${orderId}`)
      .then(async (res) => {
        if (res.status === 404) {
          setStatus("notfound");
          return;
        }
        const data = await res.json();
        setOrderNumber(data.orderNumber);
        setStatus(data.alreadyReviewed ? "already" : "ready");
      })
      .catch(() => setStatus("notfound"));
  }, [orderId]);

  async function submit() {
    if (!rating) {
      setError("Please give an overall rating.");
      return;
    }
    setSubmitting(true);
    setError("");
    const res = await fetch("/api/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orderId,
        rating,
        foodRating: foodRating || undefined,
        serviceRating: serviceRating || undefined,
        comment: comment || undefined,
      }),
    });
    setSubmitting(false);
    if (!res.ok) {
      const d = await res.json();
      setError(d.error ?? "Something went wrong, please try again.");
      return;
    }
    setStatus("submitted");
  }

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-panel">
        <p className="text-muted">Loading…</p>
      </div>
    );
  }

  if (status === "notfound") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-panel px-6">
        <p className="text-muted text-center max-w-sm">
          We couldn't find that order. If you think this is a mistake, please
          contact us directly.
        </p>
      </div>
    );
  }

  if (status === "already") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-panel px-6">
        <div className="text-center max-w-sm">
          <p className="font-display text-2xl mb-2">You've already reviewed this order</p>
          <p className="text-muted text-sm">Thanks again for your feedback!</p>
        </div>
      </div>
    );
  }

  if (status === "submitted") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-panel px-6">
        <div className="text-center max-w-sm">
          <p className="text-4xl mb-3">🙏</p>
          <p className="font-display text-2xl mb-2">Thanks for the feedback!</p>
          <p className="text-muted text-sm">
            It genuinely helps us improve order #{orderNumber}'s experience for
            next time.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-panel px-6 py-12 flex justify-center">
      <div className="w-full max-w-sm">
        <p className="font-display text-2xl mb-1">How was order #{orderNumber}?</p>
        <p className="text-muted text-sm mb-8">Takes 30 seconds — thank you!</p>

        <div className="space-y-6">
          <StarPicker value={rating} onChange={setRating} label="Overall experience" />
          <StarPicker value={foodRating} onChange={setFoodRating} label="Food quality" />
          <StarPicker value={serviceRating} onChange={setServiceRating} label="Service speed" />

          <div>
            <label className="text-sm font-medium mb-2 block">
              Anything you'd like to add? (optional)
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={4}
              className="w-full px-4 py-3 rounded-xl border border-line bg-card text-sm"
              placeholder="Tell us what stood out, good or bad…"
            />
          </div>

          {error && <p className="text-fire-dark text-sm">{error}</p>}

          <button
            onClick={submit}
            disabled={submitting}
            className="w-full py-4 rounded-xl bg-fire text-white font-semibold text-lg disabled:opacity-40"
          >
            {submitting ? "Sending…" : "Submit review"}
          </button>
        </div>
      </div>
    </div>
  );
}
