import { razorpayWebhookSecret, razorpayConfig } from '@/lib/env';
import { json } from '@/lib/http';
import { FulfilError, fulfilRazorpayPayment } from '@/lib/orders';
import { isRzpOrderId, isRzpPaymentId } from '@/lib/razorpay';
import { verifyRazorpayWebhookSignature } from '@/lib/signatures';

export const runtime = 'nodejs';
export const maxDuration = 30;

// Backup path: Razorpay -> payment.captured. Creates (or marks paid) the Woo order idempotently.
export async function POST(req: Request) {
  const secret = razorpayWebhookSecret();
  if (!secret || !razorpayConfig()) return json({ ok: false, code: 'not_configured' }, 503);
  const raw = await req.text();
  if (raw.length > 256_000) return json({ ok: false }, 413);
  if (!verifyRazorpayWebhookSignature(raw, req.headers.get('x-razorpay-signature'), secret)) return json({ ok: false, code: 'bad_signature' }, 401);

  let evt: { event?: string; payload?: { payment?: { entity?: { id?: string; order_id?: string } } } };
  try {
    evt = JSON.parse(raw);
  } catch {
    return json({ ok: false, code: 'bad_json' }, 400);
  }
  if (evt.event !== 'payment.captured') return json({ ok: true, ignored: evt.event ?? null });
  const p = evt.payload?.payment?.entity;
  if (!isRzpPaymentId(p?.id) || !isRzpOrderId(p?.order_id)) return json({ ok: true, ignored: 'no_order' });

  try {
    const r = await fulfilRazorpayPayment(p.order_id, p.id, 'webhook');
    return json({ ok: true, result: r.kind === 'woo' ? { wooOrderId: r.wooOrderId, created: r.created } : 'sample' });
  } catch (e) {
    if (e instanceof FulfilError && e.status < 500) {
      console.warn(`[rzp-webhook] ${p.order_id}: ${e.message}`);
      return json({ ok: true, ignored: e.message }); // don't make Razorpay retry a permanent failure
    }
    console.error(`[rzp-webhook] ${p.order_id} failed:`, (e as Error).message);
    return json({ ok: false }, 500); // Razorpay retries
  }
}
