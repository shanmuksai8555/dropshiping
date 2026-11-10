import { CATEGORIES } from '@/lib/categories';
import { json, notConfigured, readJson, sameOrigin } from '@/lib/http';
import { clientIp, rateLimit } from '@/lib/rate-limit';
import { appendLeadRow, isSheetsConfigured } from '@/lib/sheets';
import { cleanText, normaliseIndianMobile } from '@/lib/validation';

export const runtime = 'nodejs';

const INTERESTS = new Set(['all', ...CATEGORIES.map((c) => c.slug)]);
const SOURCES = new Set(['homepage-join', 'footer', 'other']);

export async function POST(req: Request) {
  if (!sameOrigin(req)) return json({ ok: false, code: 'bad_origin' }, 403);
  const rl = rateLimit(`lead:${clientIp(req)}`, 5, 10 * 60_000);
  if (!rl.ok) return json({ ok: false, code: 'rate_limited', message: 'Too many attempts. Please try again later.' }, 429, { 'Retry-After': String(rl.retryAfter) });

  const body = (await readJson(req, 4096)) as Record<string, unknown> | null;
  if (!body) return json({ ok: false, code: 'bad_request', message: 'Invalid request.' }, 400);

  // Honeypot: real visitors never see or fill the "company" field. Pretend success, store nothing.
  if (typeof body.company === 'string' && body.company.trim() !== '') return json({ ok: true });

  const name = cleanText(body.name, 80);
  const phone = normaliseIndianMobile(body.phone);
  const errors: Record<string, string> = {};
  if (name.length < 2) errors.name = 'Please enter your name.';
  if (!phone) errors.phone = 'Enter a 10-digit Indian mobile number, with or without +91.';
  if (Object.keys(errors).length) return json({ ok: false, code: 'invalid', errors }, 422);
  const interest = typeof body.interest === 'string' && INTERESTS.has(body.interest) ? body.interest : 'all';
  const source = typeof body.source === 'string' && SOURCES.has(body.source) ? body.source : 'other';

  if (!isSheetsConfigured()) return notConfigured('Lead capture (Google Sheets)', ['GOOGLE_SERVICE_ACCOUNT_EMAIL', 'GOOGLE_PRIVATE_KEY', 'GOOGLE_SHEET_ID']);

  try {
    await appendLeadRow([new Date().toISOString(), name, phone!, interest, source]);
    return json({ ok: true });
  } catch (e) {
    console.error('[lead] append failed:', (e as Error).message);
    return json({ ok: false, code: 'upstream_error', message: 'Could not save right now. Please try again later.' }, 502);
  }
}
