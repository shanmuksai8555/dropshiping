import { describe, expect, it } from 'vitest';
import { decodeSnapshot, encodeSnapshot, splitName } from '@/lib/checkout-snapshot';
import { validateCustomer } from '@/lib/customer';
import { CartError, parseCartInput, priceCart } from '@/lib/pricing';
import { oauth1Params, htmlToText } from '@/lib/woo';

const customer = { name: 'Asha Rao', phone: '+919876543210', email: 'asha@example.com', address1: '12, MG Road', address2: '', city: 'Bengaluru', state: 'KA', pincode: '560001' };

describe('server-side pricing (sample catalog, no WOO env)', () => {
  it('ignores client prices and uses catalog prices', async () => {
    const items = parseCartInput([{ productId: 9002, variationId: null, qty: 2, unitPrice: 1 }, { productId: 9001, variationId: 90014, qty: 1 }]);
    const priced = await priceCart(items);
    expect(priced.totalPaise).toBe(449 * 2 * 100 + 649 * 100);
    expect(priced.sample).toBe(true);
  });
  it('rejects bad input', async () => {
    expect(() => parseCartInput([])).toThrow(CartError);
    expect(() => parseCartInput([{ productId: 9002, variationId: null, qty: 0 }])).toThrow(CartError);
    expect(() => parseCartInput([{ productId: 9002, variationId: null, qty: 11 }])).toThrow(CartError);
    await expect(priceCart([{ productId: 9001, variationId: null, qty: 1 }])).rejects.toThrow(CartError); // variable needs a variation
    await expect(priceCart([{ productId: 1, variationId: null, qty: 1 }])).rejects.toThrow(CartError);
  });
  it('merges duplicate lines', () => {
    expect(parseCartInput([{ productId: 9002, qty: 2 }, { productId: 9002, qty: 3 }])).toEqual([{ productId: 9002, variationId: null, qty: 5 }]);
  });
});

describe('Razorpay notes snapshot', () => {
  it('round-trips and respects the 256-char limit', () => {
    const lines = Array.from({ length: 20 }, (_, i) => ({ productId: 100000 + i, variationId: i % 2 ? 2000000 + i : null, qty: 10, unitPaise: 12345678 }));
    const notes = encodeSnapshot(customer, lines, false);
    expect(Object.keys(notes).length).toBeLessThanOrEqual(14);
    for (const v of Object.values(notes)) expect(v.length).toBeLessThanOrEqual(256);
    const back = decodeSnapshot(notes)!;
    expect(back.lines).toEqual(lines);
    expect(back.customer).toEqual(customer);
  });
  it('rejects notes from another source', () => {
    expect(decodeSnapshot({ src: 'other', items: '1:0:1:100' })).toBeNull();
  });
  it('splits names', () => {
    expect(splitName('Asha')).toEqual({ first: 'Asha', last: '' });
    expect(splitName('Asha Devi Rao')).toEqual({ first: 'Asha Devi', last: 'Rao' });
  });
});

describe('validateCustomer', () => {
  it('accepts a valid address and normalises the phone', () => {
    expect(validateCustomer({ ...customer, phone: '98765 43210' }).customer?.phone).toBe('+919876543210');
  });
  it('reports each bad field', () => {
    const { errors } = validateCustomer({ ...customer, pincode: '012345', state: 'ZZ', email: 'x' });
    expect(Object.keys(errors).sort()).toEqual(['email', 'pincode', 'state']);
  });
});

describe('woo helpers', () => {
  it('signs OAuth1 deterministically and keeps the query', () => {
    const a = oauth1Params('GET', 'http://shop.local/wp-json/wc/v3/products', { per_page: '10' }, 'ck_x', 'cs_y', 1700000000000, 'n0nce');
    const b = oauth1Params('GET', 'http://shop.local/wp-json/wc/v3/products', { per_page: '10' }, 'ck_x', 'cs_y', 1700000000000, 'n0nce');
    expect(a.oauth_signature).toBe(b.oauth_signature);
    expect(a.per_page).toBe('10');
    expect(a.oauth_signature_method).toBe('HMAC-SHA256');
  });
  it('turns Woo HTML into plain text', () => {
    expect(htmlToText('<p>Soft &amp; warm</p><script>alert(1)</script><ul><li>One</li></ul>')).toBe('Soft & warm\n\n• One');
  });
});
