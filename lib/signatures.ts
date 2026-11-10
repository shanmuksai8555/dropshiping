import { createHmac, timingSafeEqual } from 'node:crypto';

/** Constant-time string compare. Returns false (not throws) for different lengths. */
export function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a, 'utf8');
  const bb = Buffer.from(b, 'utf8');
  if (ab.length !== bb.length) {
    // still spend comparable time
    timingSafeEqual(ab, ab);
    return false;
  }
  return timingSafeEqual(ab, bb);
}

export const hmacHex = (secret: string, data: string | Buffer) => createHmac('sha256', secret).update(data).digest('hex');
export const hmacBase64 = (secret: string, data: string | Buffer) => createHmac('sha256', secret).update(data).digest('base64');

/** Razorpay Checkout handler: signature = HMAC_SHA256(order_id + "|" + payment_id, key_secret), hex. */
export function verifyRazorpayPaymentSignature(orderId: string, paymentId: string, signature: string, keySecret: string) {
  if (!orderId || !paymentId || !signature || !keySecret) return false;
  return safeEqual(hmacHex(keySecret, `${orderId}|${paymentId}`), signature);
}

/** Razorpay webhook: X-Razorpay-Signature = HMAC_SHA256(raw body, webhook secret), hex. */
export function verifyRazorpayWebhookSignature(rawBody: string | Buffer, signature: string | null, secret: string) {
  if (!signature || !secret) return false;
  return safeEqual(hmacHex(secret, rawBody), signature);
}

/** WooCommerce webhook: X-WC-Webhook-Signature = base64(HMAC_SHA256(raw body, webhook secret)). */
export function verifyWooWebhookSignature(rawBody: string | Buffer, signature: string | null, secret: string) {
  if (!signature || !secret) return false;
  return safeEqual(hmacBase64(secret, rawBody), signature.trim());
}

/** Compare a presented bearer/admin token to the configured one. */
export function tokenMatches(presented: string | null | undefined, expected: string | undefined) {
  if (!presented || !expected) return false;
  // hash both so lengths match and nothing about the real token's length leaks
  const h = (s: string) => createHmac('sha256', 'token-compare').update(s).digest('hex');
  return safeEqual(h(presented), h(expected));
}
