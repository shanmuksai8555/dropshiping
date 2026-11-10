import { razorpayConfig } from '@/lib/env';
import { json, readJson, sameOrigin } from '@/lib/http';
import { FulfilError, fulfilRazorpayPayment } from '@/lib/orders';
import { isRzpOrderId, isRzpPaymentId } from '@/lib/razorpay';
import { verifyRazorpayPaymentSignature } from '@/lib/signatures';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  if (!sameOrigin(req)) return json({ ok: false, code: 'bad_origin' }, 403);
  const rzp = razorpayConfig();
  if (!rzp) return json({ ok: false, code: 'payments_not_configured' }, 503);
  const b = (await readJson(req, 2048)) as Record<string, unknown> | null;
  const orderId = b?.razorpay_order_id;
  const paymentId = b?.razorpay_payment_id;
  const signature = b?.razorpay_signature;
  if (!isRzpOrderId(orderId) || !isRzpPaymentId(paymentId) || typeof signature !== 'string')
    return json({ ok: false, code: 'bad_request' }, 400);
  if (!verifyRazorpayPaymentSignature(orderId, paymentId, signature, rzp.keySecret))
    return json({ ok: false, code: 'bad_signature', message: 'Payment could not be verified.' }, 400);

  try {
    const r = await fulfilRazorpayPayment(orderId, paymentId, 'verify');
    const redirect = r.kind === 'woo' ? `/order/${r.wooOrderId}?key=${encodeURIComponent(r.orderKey)}` : `/order/sample?ref=${encodeURIComponent(r.rzpOrderId)}`;
    return json({ ok: true, redirect });
  } catch (e) {
    const status = e instanceof FulfilError ? e.status : 502;
    console.error(`[checkout] verify failed for ${orderId}:`, (e as Error).message);
    // The payment itself succeeded; the webhook will retry order creation.
    return json({ ok: false, code: 'fulfil_failed', paid: true, message: 'Your payment went through, but we could not confirm the order yet. Please keep your payment ID; we will follow up.', paymentId }, status);
  }
}
