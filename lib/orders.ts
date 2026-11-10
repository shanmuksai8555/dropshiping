import 'server-only';
import { decodeSnapshot, splitName } from './checkout-snapshot';
import { fetchRzpOrder, fetchRzpPayment, notesOf, updateRzpOrderNotes, type RzpOrder } from './razorpay';
import { isWooConfigured, wooCreateOrder, wooGetOrder, wooUpdateOrder, type WooOrder } from './woo';

// Turns a verified Razorpay payment into a WooCommerce order. Shared by:
//   * POST /api/checkout/verify   (browser callback after Checkout.js success) and
//   * POST /api/razorpay/webhook  (payment.captured, the backup path if the browser never calls back).
// Idempotency: after the Woo order is created, its id is written back into the Razorpay order's notes
// (woo_order_id). Both paths check that first. The webhook additionally waits briefly before creating,
// so a verify call that is in flight normally wins. Within one server instance, concurrent calls for the
// same Razorpay order share one promise.

export type FulfilResult =
  | { kind: 'woo'; created: boolean; wooOrderId: number; orderKey: string; status: string }
  | { kind: 'sample'; rzpOrderId: string };

export class FulfilError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}

const inflight = new Map<string, Promise<FulfilResult>>();

export function fulfilRazorpayPayment(rzpOrderId: string, paymentId: string, source: 'verify' | 'webhook'): Promise<FulfilResult> {
  const existing = inflight.get(rzpOrderId);
  if (existing) return existing;
  const p = doFulfil(rzpOrderId, paymentId, source).finally(() => inflight.delete(rzpOrderId));
  inflight.set(rzpOrderId, p);
  return p;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function existingWooOrder(o: RzpOrder): Promise<WooOrder | null> {
  const id = Number(notesOf(o).woo_order_id);
  if (!Number.isInteger(id) || id <= 0) return null;
  try {
    return await wooGetOrder(id);
  } catch {
    return null;
  }
}

async function doFulfil(rzpOrderId: string, paymentId: string, source: 'verify' | 'webhook'): Promise<FulfilResult> {
  // 1. Re-read both objects from Razorpay (trusted), never from the request body.
  let order = await fetchRzpOrder(rzpOrderId);
  const payment = await fetchRzpPayment(paymentId);
  if (payment.order_id !== order.id) throw new FulfilError('Payment does not belong to this order.');
  if (payment.currency !== 'INR' || payment.amount !== order.amount) throw new FulfilError('Payment amount does not match the order.');
  if (payment.status !== 'captured' && payment.status !== 'authorized') throw new FulfilError(`Payment is ${payment.status}.`, 402);
  const captured = payment.status === 'captured';

  const snap = decodeSnapshot(notesOf(order));
  if (!snap) throw new FulfilError('This Razorpay order was not created by this store.', 400);
  if (snap.sample || !isWooConfigured()) return { kind: 'sample', rzpOrderId };

  // 2. Already created? (by the other path, or a retried call)
  let woo = await existingWooOrder(order);
  if (!woo && source === 'webhook') {
    await sleep(8000);
    order = await fetchRzpOrder(rzpOrderId);
    woo = await existingWooOrder(order);
  }
  if (woo) {
    if (captured && (woo.status === 'pending' || woo.status === 'on-hold')) {
      woo = await wooUpdateOrder(woo.id, { set_paid: true, transaction_id: paymentId });
    }
    return { kind: 'woo', created: false, wooOrderId: woo.id, orderKey: woo.order_key, status: woo.status };
  }

  // 3. Create it.
  const { first, last } = splitName(snap.customer.name);
  const address = {
    first_name: first,
    last_name: last,
    address_1: snap.customer.address1,
    address_2: snap.customer.address2,
    city: snap.customer.city,
    state: snap.customer.state,
    postcode: snap.customer.pincode,
    country: 'IN',
  };
  const body: Record<string, unknown> = {
    payment_method: 'razorpay',
    payment_method_title: 'Razorpay',
    set_paid: captured,
    ...(captured ? {} : { status: 'on-hold' }),
    transaction_id: paymentId,
    currency: 'INR',
    billing: { ...address, email: snap.customer.email, phone: snap.customer.phone },
    shipping: { ...address, phone: snap.customer.phone },
    line_items: snap.lines.map((l) => {
      const total = ((l.unitPaise * l.qty) / 100).toFixed(2);
      return {
        product_id: l.productId,
        ...(l.variationId ? { variation_id: l.variationId } : {}),
        quantity: l.qty,
        // pin the line to the price that was actually charged
        subtotal: total,
        total,
      };
    }),
    meta_data: [
      { key: '_razorpay_order_id', value: rzpOrderId },
      { key: '_razorpay_payment_id', value: paymentId },
      { key: '_razorpay_payment_status', value: payment.status },
      { key: '_storefront_created_via', value: source },
    ],
  };
  const created = await wooCreateOrder(body);
  try {
    await updateRzpOrderNotes(rzpOrderId, { ...notesOf(order), woo_order_id: String(created.id) });
  } catch (e) {
    // Not fatal; the order exists. Log so a duplicate from the other path can be spotted.
    console.error(`[orders] could not tag Razorpay order ${rzpOrderId} with Woo order ${created.id}:`, (e as Error).message);
  }
  console.info(`[orders] Woo order ${created.id} created via ${source} for ${rzpOrderId} (${payment.status})`);
  return { kind: 'woo', created: true, wooOrderId: created.id, orderKey: created.order_key, status: created.status };
}
