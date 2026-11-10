import 'server-only';

// Server-only configuration. Nothing here is ever imported by a client component, and none of these
// variables use the NEXT_PUBLIC_ prefix, so Next.js never inlines them into browser bundles.

const v = (k: string) => {
  const x = process.env[k];
  return x && x.trim() ? x.trim() : undefined;
};

export function wooConfig() {
  const url = v('WOO_URL');
  const key = v('WOO_CONSUMER_KEY');
  const secret = v('WOO_CONSUMER_SECRET');
  if (!url || !key || !secret) return null;
  const mode = v('WOO_AUTH_MODE') as 'basic' | 'query' | 'oauth1' | undefined;
  return { url: url.replace(/\/+$/, ''), key, secret, mode };
}

export function razorpayConfig() {
  const keyId = v('RAZORPAY_KEY_ID');
  const keySecret = v('RAZORPAY_KEY_SECRET');
  if (!keyId || !keySecret) return null;
  return { keyId, keySecret, testMode: keyId.startsWith('rzp_test_') };
}

export const razorpayWebhookSecret = () => v('RAZORPAY_WEBHOOK_SECRET');

export function sheetsConfig() {
  const email = v('GOOGLE_SERVICE_ACCOUNT_EMAIL');
  // Vercel/.env files usually store the PEM with literal "\n" sequences.
  const key = v('GOOGLE_PRIVATE_KEY')?.replace(/\\n/g, '\n');
  const sheetId = v('GOOGLE_SHEET_ID');
  if (!email || !key || !sheetId) return null;
  return { email, key, sheetId, range: v('GOOGLE_SHEET_RANGE') ?? 'Leads!A:E' };
}

export const wooWebhookSecret = () => v('WOO_WEBHOOK_SECRET');
export const adminToken = () => v('ADMIN_TOKEN');
export const revalidateSecret = () => v('REVALIDATE_SECRET');

export function dropdashConfig() {
  const url = v('DROPDASH_API_URL');
  const key = v('DROPDASH_API_KEY');
  return url && key ? { url, key } : null;
}

export const storeName = () => v('STORE_NAME') ?? 'Lumen Market';
