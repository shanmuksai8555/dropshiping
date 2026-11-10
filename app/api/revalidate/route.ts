import { revalidatePath, revalidateTag } from 'next/cache';
import { revalidateSecret, wooWebhookSecret } from '@/lib/env';
import { json } from '@/lib/http';
import { tokenMatches, verifyWooWebhookSignature } from '@/lib/signatures';
import { CATALOG_TAG } from '@/lib/woo';

export const runtime = 'nodejs';

// On-demand ISR. Two ways to authorise:
//  * `?secret=<REVALIDATE_SECRET>` or header `x-revalidate-secret` (manual / scripts), or
//  * a signed WooCommerce webhook (product.created / product.updated / product.deleted) using WOO_WEBHOOK_SECRET.
// Optional JSON body {"path": "/product/some-slug"} to also refresh one path.
export async function POST(req: Request) {
  const raw = await req.text();
  if (/^webhook_id=\d+$/.test(raw.trim())) return json({ ok: true, ping: true });

  const url = new URL(req.url);
  const presented = req.headers.get('x-revalidate-secret') ?? url.searchParams.get('secret');
  const bySecret = tokenMatches(presented, revalidateSecret());
  const wooSecret = wooWebhookSecret();
  const byWebhook = !!wooSecret && verifyWooWebhookSignature(raw, req.headers.get('x-wc-webhook-signature'), wooSecret);
  if (!revalidateSecret() && !wooSecret) return json({ ok: false, code: 'not_configured', missing: ['REVALIDATE_SECRET'] }, 503);
  if (!bySecret && !byWebhook) return json({ ok: false, code: 'unauthorized' }, 401);

  revalidateTag(CATALOG_TAG, 'max');
  const paths = ['/', '/shop'];
  try {
    const b = raw ? JSON.parse(raw) : {};
    if (typeof b?.path === 'string' && /^\/[\w\-/]*$/.test(b.path)) paths.push(b.path);
    if (typeof b?.slug === 'string' && /^[\w-]+$/.test(b.slug)) paths.push(`/product/${b.slug}`);
  } catch {
    /* body is optional */
  }
  revalidatePath('/category/[slug]', 'page');
  revalidatePath('/product/[slug]', 'page');
  for (const p of paths) revalidatePath(p);
  return json({ ok: true, revalidated: { tag: CATALOG_TAG, paths }, now: Date.now() });
}
