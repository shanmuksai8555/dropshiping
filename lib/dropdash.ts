import 'server-only';
import { dropdashConfig } from './env';
import type { WooOrder } from './woo';

// Dropdash fulfilment hand-off.
//
// STATUS (researched Nov 2026): Dropdash (dropdash.co) publicly documents only a Shopify app
// integration. No public REST API, endpoint list, auth scheme or order schema could be found, so this
// module does NOT guess one. What it does:
//   1. mapWooOrderToDropdash(): maps a WooCommerce order to a neutral, supplier-friendly shape
//      (DropdashOrder below - OUR shape, not a confirmed Dropdash schema).
//   2. sendToDropdash(): only if DROPDASH_API_URL and DROPDASH_API_KEY are both set, POSTs that JSON to
//      the URL with a Bearer key. TODO(dropdash-api): once Dropdash provides API docs, adjust the URL,
//      auth header and body to their spec. Until then, it logs and the CSV export
//      (GET /api/admin/orders.csv) is the Phase 1 fulfilment path.

export type DropdashOrder = {
  externalOrderId: string;
  orderNumber: string;
  createdAt: string;
  currency: string;
  paymentMode: 'prepaid' | 'cod';
  paymentStatus: 'paid' | 'unpaid';
  orderTotal: number;
  customer: { name: string; phone: string; email: string };
  shippingAddress: { line1: string; line2: string; city: string; state: string; pincode: string; country: string };
  items: { sku: string; name: string; quantity: number; unitPrice: number; lineTotal: number; productId: number; variationId: number | null }[];
};

const PAID_STATUSES = new Set(['processing', 'completed']);

export function mapWooOrderToDropdash(o: WooOrder): DropdashOrder {
  // Woo leaves shipping empty when "ship to a different address" wasn't used; fall back to billing.
  const ship = o.shipping?.address_1 ? o.shipping : o.billing;
  const name = [ship.first_name, ship.last_name].filter(Boolean).join(' ').trim() || [o.billing.first_name, o.billing.last_name].filter(Boolean).join(' ').trim();
  const cod = o.payment_method === 'cod';
  return {
    externalOrderId: String(o.id),
    orderNumber: o.number || String(o.id),
    createdAt: o.date_created,
    currency: o.currency || 'INR',
    paymentMode: cod ? 'cod' : 'prepaid',
    paymentStatus: !cod && (o.date_paid || PAID_STATUSES.has(o.status)) ? 'paid' : 'unpaid',
    orderTotal: Number(o.total) || 0,
    customer: { name, phone: ship.phone || o.billing.phone || '', email: o.billing.email || '' },
    shippingAddress: {
      line1: ship.address_1 || '',
      line2: ship.address_2 || '',
      city: ship.city || '',
      state: ship.state || '',
      pincode: ship.postcode || '',
      country: ship.country || 'IN',
    },
    items: (o.line_items ?? []).map((li) => {
      const lineTotal = Number(li.total) || 0;
      return {
        sku: li.sku || '',
        name: li.name,
        quantity: li.quantity,
        unitPrice: li.quantity ? Math.round((lineTotal / li.quantity) * 100) / 100 : 0,
        lineTotal,
        productId: li.product_id,
        variationId: li.variation_id || null,
      };
    }),
  };
}

/** Orders worth forwarding: paid (processing/completed), or COD orders that are processing. */
export const shouldForward = (o: WooOrder) => PAID_STATUSES.has(o.status);
export const alreadySynced = (o: WooOrder) => (o.meta_data ?? []).some((m) => m.key === '_dropdash_synced' && m.value);

export type SendResult = { sent: true; status: number } | { sent: false; reason: 'not_configured' | 'error'; detail?: string };

export async function sendToDropdash(order: DropdashOrder): Promise<SendResult> {
  const cfg = dropdashConfig();
  if (!cfg) {
    console.info(`[dropdash] not configured; order ${order.externalOrderId} mapped but not sent. Use the CSV export.`);
    return { sent: false, reason: 'not_configured' };
  }
  // TODO(dropdash-api): unconfirmed endpoint/auth/body. Replace with Dropdash's documented API.
  try {
    const res = await fetch(cfg.url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${cfg.key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(order),
      cache: 'no-store',
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return { sent: false, reason: 'error', detail: `HTTP ${res.status}` };
    return { sent: true, status: res.status };
  } catch (e) {
    return { sent: false, reason: 'error', detail: (e as Error).message };
  }
}

// CSV export for manual upload to a supplier (Phase 1 fallback). One row per line item.
export const CSV_HEADER = ['order_id', 'order_date', 'customer_name', 'phone', 'email', 'address_line_1', 'address_line_2', 'city', 'state', 'pincode', 'country', 'sku', 'product', 'variation', 'qty', 'unit_price', 'line_total', 'order_total', 'currency', 'payment_method', 'payment_status', 'order_status'];

export function orderToCsvRows(o: WooOrder): (string | number)[][] {
  const d = mapWooOrderToDropdash(o);
  return (o.line_items ?? []).map((li, i) => {
    const item = d.items[i];
    const variation = (li.meta_data ?? []).filter((m) => !m.key.startsWith('_')).map((m) => `${m.display_key ?? m.key}: ${m.display_value ?? String(m.value)}`).join('; ');
    return [d.orderNumber, d.createdAt, d.customer.name, d.customer.phone, d.customer.email, d.shippingAddress.line1, d.shippingAddress.line2, d.shippingAddress.city, d.shippingAddress.state, d.shippingAddress.pincode, d.shippingAddress.country, item.sku, item.name, variation, item.quantity, item.unitPrice.toFixed(2), item.lineTotal.toFixed(2), d.orderTotal.toFixed(2), d.currency, o.payment_method_title || o.payment_method, d.paymentStatus, o.status];
  });
}
