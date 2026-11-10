import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { safeEqual, tokenMatches, verifyRazorpayPaymentSignature, verifyRazorpayWebhookSignature, verifyWooWebhookSignature } from '@/lib/signatures';

describe('Razorpay payment signature', () => {
  const secret = 'test_key_secret';
  const order = 'order_ABC123def456';
  const pay = 'pay_XYZ789ghi012';
  const good = createHmac('sha256', secret).update(`${order}|${pay}`).digest('hex');

  it('accepts the HMAC-SHA256 of "order_id|payment_id"', () => {
    expect(verifyRazorpayPaymentSignature(order, pay, good, secret)).toBe(true);
  });
  it('rejects a tampered payment id, wrong secret, wrong length or empty input', () => {
    expect(verifyRazorpayPaymentSignature(order, 'pay_OTHER', good, secret)).toBe(false);
    expect(verifyRazorpayPaymentSignature(order, pay, good, 'other')).toBe(false);
    expect(verifyRazorpayPaymentSignature(order, pay, good.slice(0, -2), secret)).toBe(false);
    expect(verifyRazorpayPaymentSignature(order, pay, '', secret)).toBe(false);
    expect(verifyRazorpayPaymentSignature(order, pay, good, '')).toBe(false);
  });
  it('verifies webhook bodies byte-for-byte', () => {
    const body = JSON.stringify({ event: 'payment.captured', payload: {} });
    const sig = createHmac('sha256', 'whsec').update(body).digest('hex');
    expect(verifyRazorpayWebhookSignature(body, sig, 'whsec')).toBe(true);
    expect(verifyRazorpayWebhookSignature(body + ' ', sig, 'whsec')).toBe(false);
    expect(verifyRazorpayWebhookSignature(body, null, 'whsec')).toBe(false);
  });
});

describe('WooCommerce webhook signature', () => {
  const secret = 'woo_secret';
  const body = '{"id":1234,"status":"processing"}';
  const sig = createHmac('sha256', secret).update(body).digest('base64');
  it('accepts base64 HMAC-SHA256 of the raw body', () => {
    expect(verifyWooWebhookSignature(body, sig, secret)).toBe(true);
    expect(verifyWooWebhookSignature(Buffer.from(body), sig, secret)).toBe(true);
  });
  it('rejects hex encoding, a modified body, missing header and wrong secret', () => {
    expect(verifyWooWebhookSignature(body, createHmac('sha256', secret).update(body).digest('hex'), secret)).toBe(false);
    expect(verifyWooWebhookSignature(body.replace('1234', '1235'), sig, secret)).toBe(false);
    expect(verifyWooWebhookSignature(body, null, secret)).toBe(false);
    expect(verifyWooWebhookSignature(body, sig, 'nope')).toBe(false);
  });
});

describe('constant-time helpers', () => {
  it('safeEqual handles different lengths without throwing', () => {
    expect(safeEqual('abc', 'abcd')).toBe(false);
    expect(safeEqual('abc', 'abc')).toBe(true);
  });
  it('tokenMatches requires both values', () => {
    expect(tokenMatches('t0k3n', 't0k3n')).toBe(true);
    expect(tokenMatches('t0k3n', 'other')).toBe(false);
    expect(tokenMatches(null, 't0k3n')).toBe(false);
    expect(tokenMatches('x', undefined)).toBe(false);
  });
});
