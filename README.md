# Lumen Market — headless storefront (Next.js + WooCommerce)

Next.js 16 (App Router, TypeScript, plain CSS) storefront for the headless dropshipping store in the PRD:
WooCommerce is the catalog and order database, Razorpay takes payment (UPI, cards, netbanking), leads go to
Google Sheets, and paid orders are handed to Dropdash (CSV export until an API exists).

"Lumen Market" is a placeholder name. With **zero configuration** the site builds and runs on a clearly
labelled **sample catalog**, and every integration shows a "not configured" state instead of failing.

```bash
npm ci
npm run dev            # http://localhost:3000
npm test               # vitest unit tests
npm run lint           # eslint (flat config, next/core-web-vitals + typescript)
npm run build && npm start
```

Node 20.9+ (tested on Node 24).

## Routes

| Route | What it is |
|---|---|
| `/` | Scroll-scrubbed homepage (240 WebP frames on a canvas, real-progress preloader, 4 chapters, categories, how it works, WhatsApp join form). No animation library. |
| `/shop` | All products, category filter chips. ISR, revalidate 300 s. |
| `/category/[slug]` | `fashion`, `electronics`, `kitchenware`, `daily-essentials` (others 404). ISR. |
| `/product/[slug]` | Gallery, INR price, variations, quantity, add to cart. ISR; new slugs render on first request. |
| `/cart` | localStorage cart (`lm-cart-v1`). |
| `/checkout` | Contact + address form (Indian mobile, 6-digit PIN, WooCommerce state codes) and Razorpay Checkout.js. |
| `/order/[id]?key=wc_order_…` | Thank-you page. Needs the WooCommerce order key, so order ids can't be enumerated. `/order/sample?ref=order_…` for sample-catalog test payments. |
| `/3d` | The earlier Three.js product-viewer prototype, served as a static file (`public/3d.html`). |
| `POST /api/lead` | Name + WhatsApp number → Google Sheets row. Honeypot, per-IP rate limit, same-origin check. |
| `POST /api/checkout/create-order` | Re-prices the cart on the server, creates a Razorpay order (amount in paise). |
| `POST /api/checkout/verify` | Verifies the Checkout.js HMAC signature, then creates the WooCommerce order (`POST /wp-json/wc/v3/orders`, `set_paid: true`). |
| `POST /api/razorpay/webhook` | `payment.captured` backup path; signature-verified; idempotent. |
| `POST /api/dropdash-sync` | WooCommerce `order.created` webhook → Dropdash mapping (sender gated, see below). Handles Woo's ping. |
| `GET /api/admin/orders.csv?status=processing` | Supplier CSV (one row per line item). `Authorization: Bearer $ADMIN_TOKEN` or `?token=`. |
| `POST /api/revalidate` | On-demand ISR: `?secret=$REVALIDATE_SECRET`, or a signed WooCommerce `product.*` webhook. |

## Environment

Every variable is documented in [`.env.example`](./.env.example). Copy it to `.env.local`. Groups:

* `WOO_URL`, `WOO_CONSUMER_KEY`, `WOO_CONSUMER_SECRET` (+ optional `WOO_AUTH_MODE`), `WOO_WEBHOOK_SECRET`
* `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`
* `GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_PRIVATE_KEY`, `GOOGLE_SHEET_ID` (+ optional `GOOGLE_SHEET_RANGE`)
* `DROPDASH_API_URL`, `DROPDASH_API_KEY` (leave unset for now)
* `ADMIN_TOKEN`, `REVALIDATE_SECRET`, optional `STORE_NAME`

Behaviour when a group is missing:

| Missing | Result |
|---|---|
| WooCommerce | Sample catalog (12 generic items, "Sample" badges and a banner). Checkout only works with `rzp_test_` keys so real money can never be taken for sample items. |
| Razorpay | Checkout shows **Payments not configured**; the API returns `503 payments_not_configured`. |
| Google Sheets | `/api/lead` returns `503 {"code":"not_configured"}` and the form says sign-ups aren't open yet (nothing saved). |
| Dropdash | Orders are mapped and logged; use the CSV export. |
| `ADMIN_TOKEN` | CSV export disabled (`503`). |

## Phase 1: local development against LocalWP

1. In LocalWP create a site, install WooCommerce, add products in the four categories. Use the category
   **slugs** `fashion`, `electronics`, `kitchenware`, `daily-essentials` (the storefront routes use them).
2. WooCommerce → Settings → Advanced → REST API → *Add key* (Read/Write). Put the key and secret in `.env.local`
   with `WOO_URL=http://your-site.local` (whatever "Site host" LocalWP shows).
3. Settings → Permalinks must be anything except "Plain", or `/wp-json/` won't route.
4. `npm run dev`.

**LocalWP / http quirks**

* **Auth over http.** WooCommerce only accepts Basic auth or `consumer_key`/`consumer_secret` query params
  over HTTPS. Over plain http it requires an OAuth 1.0a signature. `lib/woo.ts` therefore signs requests
  (OAuth 1.0a, HMAC-SHA256) automatically when `WOO_URL` is `http://localhost`, `127.0.0.1` or `*.local`.
  If you enable LocalWP's SSL instead, Node won't trust its self-signed certificate unless you point
  `NODE_EXTRA_CA_CERTS` at it. `WOO_AUTH_MODE=query` forces plain query-string keys. Any other `http://` host
  is refused so keys never cross the internet unencrypted.
* **Images.** Next's image optimiser refuses private IPs, so with a local `WOO_URL` product images are served
  unoptimised. With an https `WOO_URL` the host is whitelisted automatically (`next.config.ts`).
* **Caching.** OAuth signatures make every URL unique, so Next's fetch cache can't dedupe local requests;
  page-level ISR still applies. Not an issue with https + Basic auth.
* **Webhooks to localhost.** WooCommerce delivers webhooks with `wp_safe_remote_post`, which refuses
  localhost/private addresses. For local testing either run a tunnel (e.g. `cloudflared tunnel --url
  http://localhost:3000`, free) and use the tunnel URL, or add a local-only mu-plugin with
  `add_filter('http_request_host_is_external', '__return_true');`. Deliveries run through WP-Cron/Action
  Scheduler, which on LocalWP only ticks when a page is loaded.
* **Razorpay webhooks** can't reach localhost either; use the same tunnel. The browser `verify` path works
  without it.
* **Vercel can't reach LocalWP.** A Vercel deploy can only show real products once WooCommerce is on a public
  https host (Phase 2). Until then a Vercel build falls back to an "offline" notice, not sample data, if
  `WOO_URL` is set but unreachable — leave `WOO_URL` unset on Vercel during Phase 1 to show the sample catalog.

## Deploying to Vercel (outline)

1. Push this folder to a Git repo and import it in Vercel (framework: Next.js, no extra settings).
2. Add the env vars for the integrations you're ready to use (Production + Preview). Use `rzp_test_` keys first.
3. After Phase 2, set `WOO_URL=https://<your-oracle-host>` and redeploy so product pages are pre-rendered.
4. Register the webhooks below with your Vercel URL.
5. Free-plan notes: check your plan's function duration limit (`maxDuration = 30` is set on the Razorpay
   webhook, which waits ~8 s to let the browser path win) and its image-optimisation quota.

## Webhooks to register

| Where | Topic / event | Delivery URL | Secret |
|---|---|---|---|
| WooCommerce → Settings → Advanced → Webhooks | Order created (`order.created`), API v3 | `https://<site>/api/dropdash-sync` | `WOO_WEBHOOK_SECRET` |
| WooCommerce (optional) | Order updated (`order.updated`) | `https://<site>/api/dropdash-sync` | `WOO_WEBHOOK_SECRET` |
| WooCommerce | Product created / updated / deleted | `https://<site>/api/revalidate` | `WOO_WEBHOOK_SECRET` |
| Razorpay Dashboard → Webhooks | `payment.captured` | `https://<site>/api/razorpay/webhook` | `RAZORPAY_WEBHOOK_SECRET` |

## How checkout works

1. The browser sends only `{productId, variationId, qty}` + contact/address to `/api/checkout/create-order`.
2. The server re-reads each product from WooCommerce (uncached) or the sample catalog, rejects unavailable or
   out-of-stock items, computes the total in paise, and creates a Razorpay order. The validated customer and
   priced lines are stored in the Razorpay order's `notes` (≤15 keys × 256 chars).
3. Checkout.js opens (UPI, cards, netbanking). On success the browser posts the three Razorpay ids to
   `/api/checkout/verify`, which checks `HMAC_SHA256(order_id|payment_id)` with a timing-safe compare, then
   re-fetches the order **and** payment from Razorpay (amount, currency, status, order match) and builds the
   WooCommerce order from Razorpay's copy of the notes — never from the browser. Line totals are pinned to the
   price that was charged. `meta_data` carries `_razorpay_order_id` / `_razorpay_payment_id`.
   `payment_method: "razorpay"`, `set_paid: true` (or `on-hold` if the payment is only authorised).
4. The Woo order id is written back to the Razorpay order notes. The webhook path checks that first, and
   waits ~8 s before creating, so the two paths don't both create an order in normal conditions.
5. Shipping charges and taxes are **not** added by this storefront; the order total is the items' total.
   Configure those in WooCommerce and extend `lib/pricing.ts` before going live if you charge them.

## Dropdash

Research (Nov 2026): Dropdash (dropdash.co) publicly documents only a **Shopify app** integration; no public
REST API, endpoint, auth scheme or order schema was found. So:

* `lib/dropdash.ts` maps a WooCommerce order to a neutral `DropdashOrder` shape (customer, address, SKUs,
  quantities, prices, payment status). That shape is **ours**, not Dropdash's.
* `sendToDropdash()` only runs when `DROPDASH_API_URL` and `DROPDASH_API_KEY` are both set, and then POSTs that
  JSON with a Bearer key — marked `TODO(dropdash-api)` to be replaced with Dropdash's real spec. On success it
  tags the Woo order `_dropdash_synced` so it is forwarded once.
* Until then, use the **CSV export**: `GET /api/admin/orders.csv?status=processing` with
  `Authorization: Bearer $ADMIN_TOKEN`. Columns: order_id, order_date, customer_name, phone, email,
  address_line_1, address_line_2, city, state, pincode, country, sku, product, variation, qty, unit_price,
  line_total, order_total, currency, payment_method, payment_status, order_status. Cells are RFC 4180-quoted
  and formula-injection-safe (phone numbers like `+91…` are kept as-is). UTF-8 with BOM for Excel.
* Ask Dropdash support whether they accept orders by API, CSV upload, or only via Shopify.

## Security notes

* All integration code is in `lib/*` modules that `import 'server-only'`; a client import fails the build.
  No secret uses `NEXT_PUBLIC_`. (`npm run build` then `rg WOO_CONSUMER .next/static` finds nothing.)
* HMAC checks (Razorpay payment, Razorpay webhook, WooCommerce webhook) and token checks use
  `crypto.timingSafeEqual`. Webhooks verify the **raw** body.
* Server-side validation of every input (Indian mobile, PIN, state code, email, lengths, cart quantities 1–10,
  max 20 lines). Client prices are ignored.
* Woo descriptions are rendered as plain text (HTML stripped), never via `dangerouslySetInnerHTML`.
* Browser-facing POST routes reject cross-origin `Origin` headers. Rate limits are in-memory per instance
  (not global on serverless; add Upstash/Vercel KV if abuse appears).
* Sheets rows use `valueInputOption=RAW`, so names can't become formulas.
* Not done yet: a Content-Security-Policy (Checkout.js needs `checkout.razorpay.com` / `api.razorpay.com`).

## Homepage frames

`public/frames/0001.webp … 0240.webp` (1600×1000) are copied from the Ora homepage build
(`/workspace/ora-store/public/frames`). Frame 1 is server-rendered as a priority `<img>` (the LCP
candidate) beneath the canvas; the canvas fades in over it once it has drawn. If the frames are regenerated
there, copy them again. Fonts (Instrument Sans/Serif, JetBrains Mono, SIL OFL) are self-hosted via
`next/font/local` from `app/fonts/`.

## What is placeholder

* Brand name, the sample catalog (items, prices, SVG images), homepage copy and films (illustrative).
* No reviews, ratings, stock counts or delivery promises are shown. Stock state is shown only when
  WooCommerce reports an item out of stock.
