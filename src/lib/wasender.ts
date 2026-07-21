/**
 * WaSenderAPI integration.
 *
 * TODO once you have a WaSenderAPI account:
 * 1. Sign up at https://wasenderapi.com and connect a WhatsApp number/session.
 * 2. Copy the API key + session id into .env as WASENDER_API_KEY and
 *    WASENDER_SESSION_ID.
 * 3. Confirm the exact send-message endpoint/payload shape in their docs
 *    (it's a thin REST wrapper around a WhatsApp session, but field names
 *    have changed between their API versions) and adjust the fetch call
 *    below if needed.
 *
 * Until those env vars are set, this module logs what WOULD be sent and
 * returns a mocked success so the rest of the order flow (checkout, review
 * scheduling) works end-to-end without a live WhatsApp connection.
 */

const WASENDER_API_URL = "https://wasenderapi.com/api/send-message";

type SendResult = { ok: boolean; mocked: boolean; error?: string };

export async function sendWhatsAppMessage(
  phone: string,
  message: string
): Promise<SendResult> {
  const apiKey = process.env.WASENDER_API_KEY;

  if (!apiKey) {
    console.log(
      `[wasender:MOCK] Would send to ${phone}:\n${message}\n(Set WASENDER_API_KEY in .env to send for real.)`
    );
    return { ok: true, mocked: true };
  }

  try {
    const res = await fetch(WASENDER_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        to: phone,
        text: message,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error("[wasender] send failed", res.status, text);
      return { ok: false, mocked: false, error: text };
    }

    return { ok: true, mocked: false };
  } catch (err) {
    console.error("[wasender] network error", err);
    return { ok: false, mocked: false, error: String(err) };
  }
}

export function buildOrderReadyMessage(orderNumber: number) {
  return `Your order #${orderNumber} is ready for pickup! Thanks for waiting 🙌`;
}

export function buildReviewMessage(orderNumber: number, reviewUrl: string) {
  return `Thanks for your order #${orderNumber}! We'd love your feedback (takes 30 seconds): ${reviewUrl}`;
}

type ReceiptItem = { name: string; quantity: number; unitPrice: number; lineTotal: number };

/** Text-based order-confirmation receipt, sent right after checkout. */
export function buildOrderReceiptMessage(params: {
  orderNumber: number;
  businessName: string;
  items: ReceiptItem[];
  subtotal: number;
  deliveryFee: number;
  discountLabel?: string | null;
  discountAmount: number;
  total: number;
  orderType: "PICKUP" | "DELIVERY";
  currency: string;
}) {
  const { orderNumber, businessName, items, subtotal, deliveryFee, discountLabel, discountAmount, total, orderType, currency } =
    params;

  const lines = items.map(
    (i) => `${i.quantity}x ${i.name} — ${i.lineTotal.toFixed(2)} ${currency}`
  );

  const parts = [
    `${businessName} — Order #${orderNumber} confirmed ✅`,
    "",
    ...lines,
    "",
    `Subtotal: ${subtotal.toFixed(2)} ${currency}`,
  ];

  if (orderType === "DELIVERY" && deliveryFee > 0) {
    parts.push(`Delivery fee: ${deliveryFee.toFixed(2)} ${currency}`);
  }
  if (discountAmount > 0) {
    parts.push(`Discount (${discountLabel ?? "applied"}): -${discountAmount.toFixed(2)} ${currency}`);
  }
  parts.push(`Total: ${total.toFixed(2)} ${currency}`);
  parts.push("", orderType === "DELIVERY" ? "Your order is on its way soon!" : "We'll message you when it's ready for pickup!");

  return parts.join("\n");
}
