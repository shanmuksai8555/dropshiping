import { catalogSource } from '@/lib/catalog';
import { encodeSnapshot } from '@/lib/checkout-snapshot';
import { validateCustomer } from '@/lib/customer';
import { razorpayConfig, storeName } from '@/lib/env';
import { toPaise } from '@/lib/format';
import { json, readJson, sameOrigin } from '@/lib/http';
import { CartError, parseCartInput, priceCart } from '@/lib/pricing';
import { clientIp, rateLimit } from '@/lib/rate-limit';
import { createRzpOrder } from '@/lib/razorpay';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  if (!sameOrigin(req)) return json({ ok: false, code: 'bad_origin' }, 403);
  const rzp = razorpayConfig();
  if (!rzp) return json({ ok: false, code: 'payments_not_configured', message: 'Payments are not configured yet.' }, 503);
  // Never take real money for sample items: the sample catalog only works with Razorpay TEST keys.
  if (catalogSource() === 'sample' && !rzp.testMode)
    return json({ ok: false, code: 'catalog_not_configured', message: 'The store catalog is not connected, so live payments are disabled.' }, 503);

  const rl = rateLimit(`checkout:${clientIp(req)}`, 20, 10 * 60_000);
  if (!rl.ok) return json({ ok: false, code: 'rate_limited', message: 'Too many attempts. Please wait a few minutes.' }, 429);

  const body = (await readJson(req)) as Record<string, unknown> | null;
  if (!body) return json({ ok: false, code: 'bad_request', message: 'Invalid request.' }, 400);
  const { customer, errors } = validateCustomer(body.customer);
  if (!customer) return json({ ok: false, code: 'invalid', errors }, 422);

  try {
    const items = parseCartInput(body.items);
    const priced = await priceCart(items);
    if (priced.totalPaise < 100) return json({ ok: false, code: 'invalid', message: 'Order total must be at least ₹1.' }, 422);
    const notes = encodeSnapshot(
      customer,
      priced.lines.map((l) => ({ productId: l.productId, variationId: l.variationId, qty: l.qty, unitPaise: toPaise(l.unitPrice) })),
      priced.sample,
    );
    const order = await createRzpOrder(priced.totalPaise, `web-${Date.now().toString(36)}`, notes);
    return json({
      ok: true,
      keyId: rzp.keyId, // the key id is public by design; the secret never leaves the server
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      storeName: storeName(),
      lines: priced.lines,
      total: priced.totalRupees,
      sample: priced.sample,
      prefill: { name: customer.name, email: customer.email, contact: customer.phone },
    });
  } catch (e) {
    if (e instanceof CartError) return json({ ok: false, code: 'cart', message: e.message }, 422);
    console.error('[checkout] create-order failed:', (e as Error).message);
    return json({ ok: false, code: 'upstream_error', message: 'Could not start the payment. Please try again.' }, 502);
  }
}
