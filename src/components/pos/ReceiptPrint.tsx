export type ReceiptOrder = {
  orderNumber: number;
  businessName: string;
  currency: string;
  items: {
    name: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
    isBundle?: boolean;
    subItems?: {
      quantity: number;
      name: string;
      note: string | null;
    }[];
  }[];
  subtotal: number;
  deliveryFee: number;
  discountLabel: string | null;
  discountAmount: number;
  total: number;
  orderType: "PICKUP" | "DELIVERY";
  paymentMethod: string;
  customerName?: string;
  customerPhone?: string;
  createdAt: string;
  notes?: string;
};

const PAYMENT_LABELS: Record<string, string> = {
  CASH: "Cash",
  VODAFONE_CASH: "Vodafone Cash",
  INSTAPAY: "Instapay",
  TELDA: "Telda",
  CREDIT_CARD: "Credit",
};

export default function ReceiptPrint({ order }: { order: ReceiptOrder }) {
  return (
    <div id="receipt-print">
      <div style={{ textAlign: "center", marginBottom: 8 }}>
        <div style={{ fontWeight: 700, fontSize: 14 }}>
          {order.businessName}
        </div>
        <div>Order #{order.orderNumber}</div>
        <div>{new Date(order.createdAt).toLocaleString()}</div>
        <div>{order.orderType === "DELIVERY" ? "Delivery" : "Pickup"}</div>
        {order.customerName && (
          <div>
            Customer: {order.customerName}
            {order.customerPhone ? ` (${order.customerPhone})` : ""}
          </div>
        )}
      </div>
      <div style={{ borderTop: "1px dashed #000", margin: "6px 0" }} />
      {order.items.map((item, i) => (
        <div
          key={i}
          style={{ display: "flex", flexDirection: "column", marginBottom: 6 }}
        >
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span>
              {item.quantity}x {item.name}
            </span>
            <span>{item.lineTotal.toFixed(2)}</span>
          </div>
          {/* Bundle Sub-items Display */}
          {item.isBundle && item.subItems && item.subItems.length > 0 && (
            <div style={{ marginLeft: 12, fontSize: 11, marginTop: 2 }}>
              {item.subItems.map((sub, j) => (
                <div key={j} style={{ marginBottom: 2 }}>
                  <div>
                    - {sub.quantity}x {sub.name}
                  </div>
                  {sub.note && (
                    <div style={{ marginLeft: 8, fontStyle: "italic" }}>
                      "{sub.note}"
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}

      {order.notes && (
        <div
          style={{
            background: "#f0f0f0",
            padding: "4px 6px",
            margin: "4px 0",
            fontSize: 11,
          }}
        >
          📝 {order.notes}
        </div>
      )}

      <div style={{ borderTop: "1px dashed #000", margin: "6px 0" }} />
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <span>Subtotal</span>
        <span>{order.subtotal.toFixed(2)}</span>
      </div>
      {order.deliveryFee > 0 && (
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span>Delivery fee</span>
          <span>{order.deliveryFee.toFixed(2)}</span>
        </div>
      )}
      {order.discountAmount > 0 && (
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span>{order.discountLabel ?? "Discount"}</span>
          <span>-{order.discountAmount.toFixed(2)}</span>
        </div>
      )}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontWeight: 700,
          fontSize: 13,
          marginTop: 4,
        }}
      >
        <span>TOTAL</span>
        <span>
          {order.total.toFixed(2)} {order.currency}
        </span>
      </div>
      <div style={{ borderTop: "1px dashed #000", margin: "6px 0" }} />
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <span>Paid via</span>
        <span>
          {PAYMENT_LABELS[order.paymentMethod] ?? order.paymentMethod}
        </span>
      </div>
      <div style={{ textAlign: "center", marginTop: 10 }}>
        <div>Thank you! ❤️</div>
        <div style={{ fontWeight: 700, marginTop: 2 }}>No Bun No Fun</div>
      </div>
    </div>
  );
}
