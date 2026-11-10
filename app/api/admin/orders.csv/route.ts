import { CSV_HEADER, orderToCsvRows } from '@/lib/dropdash';
import { adminToken } from '@/lib/env';
import { json, notConfigured } from '@/lib/http';
import { toCsv } from '@/lib/csv';
import { clientIp, rateLimit } from '@/lib/rate-limit';
import { tokenMatches } from '@/lib/signatures';
import { isWooConfigured, wooListOrders } from '@/lib/woo';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const STATUSES = new Set(['pending', 'processing', 'on-hold', 'completed', 'cancelled', 'refunded', 'failed', 'any']);

// Phase 1 Dropdash fallback: download paid orders as CSV for manual upload to the supplier.
// Auth: `Authorization: Bearer <ADMIN_TOKEN>` (preferred) or `?token=<ADMIN_TOKEN>` for a browser download.
export async function GET(req: Request) {
  const expected = adminToken();
  if (!expected) return notConfigured('The admin CSV export', ['ADMIN_TOKEN']);
  const rl = rateLimit(`csv:${clientIp(req)}`, 30, 10 * 60_000);
  if (!rl.ok) return json({ ok: false, code: 'rate_limited' }, 429);

  const url = new URL(req.url);
  const auth = req.headers.get('authorization');
  const presented = auth?.startsWith('Bearer ') ? auth.slice(7).trim() : url.searchParams.get('token');
  if (!tokenMatches(presented, expected)) return json({ ok: false, code: 'unauthorized' }, 401, { 'WWW-Authenticate': 'Bearer' });

  const status = url.searchParams.get('status') ?? 'processing';
  if (!STATUSES.has(status)) return json({ ok: false, code: 'bad_status' }, 400);
  if (!isWooConfigured()) return notConfigured('WooCommerce', ['WOO_URL', 'WOO_CONSUMER_KEY', 'WOO_CONSUMER_SECRET']);

  try {
    const orders = await wooListOrders(status);
    const csv = toCsv(CSV_HEADER, orders.flatMap(orderToCsvRows));
    const day = new Date().toISOString().slice(0, 10);
    return new Response('\uFEFF' + csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="orders-${status}-${day}.csv"`,
        'Cache-Control': 'no-store',
        'X-Robots-Tag': 'noindex',
      },
    });
  } catch (e) {
    console.error('[orders.csv] failed:', (e as Error).message);
    return json({ ok: false, code: 'upstream_error' }, 502);
  }
}
