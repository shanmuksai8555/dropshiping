import { alreadySynced, mapWooOrderToDropdash, sendToDropdash, shouldForward } from '@/lib/dropdash';
import { wooWebhookSecret } from '@/lib/env';
import { json } from '@/lib/http';
import { verifyWooWebhookSignature } from '@/lib/signatures';
import { isWooConfigured, wooUpdateOrder, type WooOrder } from '@/lib/woo';

export const runtime = 'nodejs';

// WooCommerce webhook receiver (topic order.created; order.updated also accepted).
// Register in WooCommerce > Settings > Advanced > Webhooks with delivery URL
// https://<your-site>/api/dropdash-sync and the same secret as WOO_WEBHOOK_SECRET.
//
// Always answers 2xx for well-signed deliveries, even when forwarding is skipped: WooCommerce disables a
// webhook after repeated failed deliveries. Failures are logged; the CSV export is the fallback.
export async function POST(req: Request) {
  const raw = await req.text();
  if (raw.length > 512_000) return json({ ok: false }, 413);

  // WooCommerce "ping" sent when a webhook is saved: form body `webhook_id=<id>`, unsigned. No side effects.
  if (/^webhook_id=\d+$/.test(raw.trim())) return json({ ok: true, ping: true });

  const secret = wooWebhookSecret();
  if (!secret) return json({ ok: false, code: 'not_configured', missing: ['WOO_WEBHOOK_SECRET'] }, 503);
  if (!verifyWooWebhookSignature(raw, req.headers.get('x-wc-webhook-signature'), secret)) return json({ ok: false, code: 'bad_signature' }, 401);

  const topic = req.headers.get('x-wc-webhook-topic') ?? '';
  if (topic && topic !== 'order.created' && topic !== 'order.updated') return json({ ok: true, ignored: topic });

  let order: WooOrder;
  try {
    order = JSON.parse(raw);
  } catch {
    return json({ ok: false, code: 'bad_json' }, 400);
  }
  if (!order || typeof order.id !== 'number' || !Array.isArray(order.line_items)) return json({ ok: false, code: 'not_an_order' }, 400);

  const mapped = mapWooOrderToDropdash(order);
  const summary = { orderId: mapped.externalOrderId, status: order.status, items: mapped.items.length, total: mapped.orderTotal };

  if (!shouldForward(order)) {
    console.info(`[dropdash-sync] order ${order.id} is ${order.status}; not forwarding until paid/processing.`);
    return json({ ok: true, forwarded: false, reason: 'not_paid', summary });
  }
  if (alreadySynced(order)) return json({ ok: true, forwarded: false, reason: 'already_synced', summary });

  const result = await sendToDropdash(mapped);
  if (result.sent && isWooConfigured()) {
    try {
      await wooUpdateOrder(order.id, { meta_data: [{ key: '_dropdash_synced', value: new Date().toISOString() }] });
    } catch (e) {
      console.error(`[dropdash-sync] sent order ${order.id} but could not mark it synced:`, (e as Error).message);
    }
  } else if (!result.sent && result.reason === 'error') {
    console.error(`[dropdash-sync] forwarding order ${order.id} failed: ${result.detail}. Use the CSV export.`);
  }
  return json({ ok: true, forwarded: result.sent, reason: result.sent ? undefined : result.reason, summary });
}
