# Counter POS — Core

Module 1 of the full system: the cashier-facing POS terminal. Built to run
on Vercel with a Neon Postgres database.

## What's in this module

- **PIN login** for cashiers, opens/reuses a `Shift` on login.
- **Touch-friendly product grid** with category tabs, sized for iPad use.
- **Cart / ticket panel** with quantity steppers and running total.
- **Checkout** supporting Cash, Vodafone Cash, Instapay, Credit Card.
- **Recipe-based stock decrement**: every `Product` has `ProductIngredient`
  rows (e.g. Double Cheeseburger → 2× Burger Patty). On checkout, all
  ingredients used across the order are decremented in one DB transaction,
  each change logged to `StockMovement`, and any ingredient at/below its
  fixed `lowStockThreshold` is returned as a warning shown to the cashier.
- **WhatsApp hooks** via WaSenderAPI (`src/lib/wasender.ts`):
  - "Order ready" message sent when an order's status is set to `READY`.
  - A review-request message auto-scheduled for 10 minutes after checkout,
    sent by a Vercel Cron job (`vercel.json`, runs every minute) that hits
    `/api/cron/send-reviews`.
  - **Both run in mock mode** (logs instead of sending) until you add a
    `WASENDER_API_KEY` — see `.env.example`.
- A placeholder `/review/[orderId]` page — the real analytics review form is
  a separate build item, this just proves the link works end to end.

## Not in this module yet (coming in later modules, per the plan)

- Admin dashboard (cashier management, finances/accounting, stock config UI,
  env/integration config, analytics & charts, cashier performance/shift
  tracking, reviews inbox).
- Order refund/history browsing UI (the API route `PATCH /api/orders/[id]`
  already supports `REFUNDED`/`CANCELLED`/`COMPLETED` transitions and
  restocks ingredients on refund — the admin UI just needs to call it).
- The real customer review form + analytics capture.
- Combo-meal *modifier* UI (right now a combo is modeled as its own product
  with its own recipe, e.g. "Cheeseburger Combo" — simplest path today;
  a true modifier/add-on system can replace this later without touching the
  stock engine, since it already aggregates by ingredient).

## Setup

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Create a Neon database** at https://neon.tech, then copy both the
   pooled and direct connection strings into `.env` (copy `.env.example`
   first: `cp .env.example .env`).

3. **Push the schema and seed sample data**
   ```bash
   npm run db:push
   npm run db:seed
   ```
   This creates a cashier (PIN `1234`), an admin (PIN `0000`), and sample
   products including the Double Cheeseburger recipe example.

4. **Run locally**
   ```bash
   npm run dev
   ```
   Visit `http://localhost:3000`, log in with PIN `1234`.

5. **Deploy to Vercel**
   - Import the repo into Vercel.
   - Add the same env vars from `.env` to the Vercel project settings.
   - Vercel will pick up `vercel.json`'s cron config automatically once
     deployed (crons only run on deployed projects, not locally).

## Configuring stock & recipes right now

There's no admin UI yet for this module, so for now edit via
`npm run db:studio` (opens Prisma Studio) or extend `prisma/seed.ts`:

- `Ingredient.stockQty` — current stock.
- `Ingredient.lowStockThreshold` — fixed quantity that triggers the low-stock
  warning at checkout (per your answer: fixed quantity per ingredient, e.g.
  warn under 4 packs-worth of patties).
- `Ingredient.packSize` — informational, for restock reference.
- `ProductIngredient` — the recipe: which ingredients a product consumes and
  how much. This is what makes "Double Cheeseburger uses 2 patties" work —
  add a row per ingredient per product.

The full stock configuration page (add/edit ingredients, build recipes
visually, adjust thresholds) is part of the Admin Dashboard module.

## On "Credit" as a payment method

I've implemented it as `CREDIT_CARD` (card payments) since that's the most
common meaning alongside Cash/Vodafone Cash/Instapay. If you meant house
credit/tab accounts instead, let me know and I'll add that as its own
payment type with a linked customer ledger.

---

## Module 2: Admin Dashboard + real review form

Everything below is new since module 1.

### Admin Dashboard (`/admin`)

Logs in with the **same PIN login** at `/login` — a cashier with `role:
ADMIN` (seeded as PIN `0000`, "Manager") lands on `/admin` after login
instead of `/pos`. Anyone without the `ADMIN` role is redirected away from
`/admin/*` server-side (`src/app/admin/layout.tsx`), so no separate login
system to maintain.

Pages:
- **Overview** (`/admin`) — revenue trend, top products, order-status
  counts, and a live low-stock banner. Charts via Recharts.
- **Cashiers** (`/admin/cashiers`) — create cashiers/admins, reset PINs,
  deactivate/reactivate (soft-delete, so order history stays intact).
- **Stock & Ingredients** (`/admin/stock`) — add ingredients, set the fixed
  low-stock threshold, restock (logs a `StockMovement` with reason
  `RESTOCK`), and set cost-per-unit for profit tracking.
- **Products & Recipes** (`/admin/products`) — this is the config page from
  module 1's plan: build/edit the bill-of-materials per product (e.g.
  Double Cheeseburger → 2× Burger Patty). Combo meals are just products with
  a longer recipe list — no separate modifier system needed yet.
- **Finances** (`/admin/finances`) — revenue, COGS (computed from
  `StockMovement` × ingredient `costPerUnit`), manually-logged expenses, and
  profit, plus a revenue-by-day chart and payment-method breakdown. Log
  expenses (rent, utilities, wages, restocking invoices, etc.) right there.
- **Cashier Performance** (`/admin/performance`) — sales totals, order
  counts, average order value per cashier, a "Top performer" callout, and
  expandable shift history (clock-in/out) per cashier.
- **Reviews** (`/admin/reviews`) — inbox of submitted reviews with star
  ratings, average rating, and comments, linked back to the order and the
  cashier who served it.
- **Settings** (`/admin/settings`) — business name, currency label, review
  delay minutes, default low-stock threshold (all stored in the DB,
  editable in-app). Also shows **integration status** (is WaSenderAPI
  configured? is the DB connected?) as read-only indicators — actual
  secrets stay in Vercel env vars, never editable from inside the app, for
  security.

New Prisma models: `Expense`, `Review`, `AppSettings`, plus `costPerUnit` on
`Ingredient`. Run `npm run db:push` again after pulling this to apply them.

### Real customer review form (`/review/[orderId]`)

Replaces the module-1 placeholder. Star ratings for overall / food /
service, an optional comment box, duplicate-submission protection (an order
can only be reviewed once), and clear "not found" / "already reviewed" /
"thank you" states. Submits to the public `POST /api/reviews` endpoint,
which is what the WhatsApp review-link cron job already points at — no
other wiring needed.

### Not yet built

- Order refund/history browser *inside* the POS or admin UI (the API routes
  already support it — see module 1 notes — it just needs a screen).
- Any deeper WhatsApp automation beyond order-ready + review-request (e.g.
  marketing broadcasts).
- Multi-location support (current schema assumes a single restaurant).

---

## Module 3: Order Management, Checkout Enhancements, Shift Tracking

### 1. Business Day accounting (2pm–4am)

A new `BusinessDay` model — separate from the existing per-cashier `Shift`
model — represents the restaurant-wide accounting period. It is **never**
inferred from the calendar date; an admin explicitly presses **Start New
Day** / **End Day** on the Overview page (`BusinessDayCard` component).
Every `Order` and every `StockMovement` created while a day is open is
tagged with its `businessDayId`, which is what all financial analytics
group by. Checkout is blocked with a clear banner on the POS page if no day
is open.

### 2. Payment breakdown, including Telda

`PaymentMethod` now includes `TELDA`. The `BusinessDayCard` shows money
collected **for the currently active business day only**, broken down by
Cash / Vodafone Cash / Instapay / Telda / Credit — exactly as specified.

### 3. VIEWER role

`Role` now includes `VIEWER`. Viewers log in with the same PIN flow and get
full read access to `/admin` (charts, shift data, orders) via
`getDashboardSession()`, but every mutating action — create/edit/delete,
refunds, settings, business-day start/end — is both hidden in the UI
(`useCanEdit()` from `RoleContext`) and rejected server-side if called
directly, so hiding the button is never the only protection.

### 4. Order History (`/orders`)

A new page, outside `/admin` since cashiers use it too:
- **Cashiers** see only orders from the currently open business day.
- **Admin/Viewer** get full historic access with filters — business day,
  cashier, payment method, status, date range.
- Ready/Complete actions available to cashiers and admins; **Refund** is
  admin-only (enforced in the API, not just hidden).
- A **Print** button per row reuses the same receipt component as checkout.

### 5. Checkout UI: order type + discounts

- **Pickup / Delivery** toggle — Delivery automatically adds the
  configurable delivery fee (default 20 EGP, editable in
  `/admin/settings`) to the total.
- **Discount dropdown**: "Owner (10% Off)", "Staff (25% Off)", "Custom
  Amount" (free-form EGP amount, capped at the subtotal). The cart shows a
  live preview; the server recomputes and is authoritative.

### 6. Customer tracking (CRM)

A `Customer` model (name, phone, `totalOrders`, `totalSpent`) is
upserted by phone at checkout. Typing a phone number in the checkout panel
debounce-looks-up the customer and shows a **⭐ Loyal Customer** badge once
they pass 5 past orders.

### 7. Print receipt + WhatsApp order summary

- **Print Receipt**: a hidden `#receipt-print` component styled for an
  80mm thermal printer via `@media print` (see `globals.css`) — everything
  else is hidden when printing. Triggered from the post-checkout toast and
  from any row in Order History.
- **WhatsApp**: `buildOrderReceiptMessage()` in `lib/wasender.ts` formats a
  text receipt (items, delivery fee, discount, total) and is sent
  automatically right after checkout if a phone number was entered — a
  best-effort call that never blocks or fails the checkout itself.

### 8. Login page

Redesigned with a branded dark backdrop, a subtle dot-grid + glow, and a
card-style PIN pad. Login now redirects by role: cashiers → `/pos`,
admins/viewers → `/admin`.

### New seed data

The seed script now also creates a **Viewer** account — PIN `2222`
("Investor") — alongside the existing Cashier (`1234`) and Admin (`0000`).
No business day is seeded automatically; press **Start New Day** as the
admin after logging in for the first time.

Run `npm run db:push && npm run db:seed` again to pick up the new
`BusinessDay`, `Customer`, and updated enum/Order fields.
