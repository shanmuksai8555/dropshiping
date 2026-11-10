import { describe, expect, it } from 'vitest';
import { alreadySynced, CSV_HEADER, mapWooOrderToDropdash, orderToCsvRows, shouldForward } from '@/lib/dropdash';
import { sampleWooOrder } from './fixtures';

describe('mapWooOrderToDropdash', () => {
  it('maps customer, address, items and payment', () => {
    const d = mapWooOrderToDropdash(sampleWooOrder());
    expect(d).toMatchObject({
      externalOrderId: '1234',
      orderNumber: '1234',
      currency: 'INR',
      paymentMode: 'prepaid',
      paymentStatus: 'paid',
      orderTotal: 1847,
      customer: { name: 'Asha Rao', phone: '+919876543210', email: 'asha@example.com' },
      shippingAddress: { line1: '12, MG Road', city: 'Bengaluru', state: 'KA', pincode: '560001', country: 'IN' },
    });
    expect(d.items).toEqual([
      { sku: 'TS-M', name: 'Cotton crew T-shirt - M', quantity: 2, unitPrice: 599, lineTotal: 1198, productId: 9001, variationId: 90012 },
      { sku: '', name: 'Steel bottle', quantity: 1, unitPrice: 649, lineTotal: 649, productId: 9007, variationId: null },
    ]);
  });
  it('falls back to the billing address when shipping is empty', () => {
    const o = sampleWooOrder();
    o.shipping = { first_name: '', last_name: '', address_1: '', address_2: '', city: '', state: '', postcode: '', country: '' };
    const d = mapWooOrderToDropdash(o);
    expect(d.shippingAddress.pincode).toBe('560001');
    expect(d.customer.name).toBe('Asha Rao');
    expect(d.customer.phone).toBe('+919876543210');
  });
  it('marks COD and unpaid orders', () => {
    expect(mapWooOrderToDropdash(sampleWooOrder({ payment_method: 'cod', date_paid: null })).paymentMode).toBe('cod');
    expect(mapWooOrderToDropdash(sampleWooOrder({ status: 'pending', date_paid: null })).paymentStatus).toBe('unpaid');
  });
  it('only forwards paid statuses, once', () => {
    expect(shouldForward(sampleWooOrder())).toBe(true);
    expect(shouldForward(sampleWooOrder({ status: 'pending' }))).toBe(false);
    expect(shouldForward(sampleWooOrder({ status: 'on-hold' }))).toBe(false);
    expect(alreadySynced(sampleWooOrder({ meta_data: [{ key: '_dropdash_synced', value: '2026-11-10' }] }))).toBe(true);
    expect(alreadySynced(sampleWooOrder())).toBe(false);
  });
  it('builds one CSV row per line item matching the header', () => {
    const rows = orderToCsvRows(sampleWooOrder());
    expect(rows).toHaveLength(2);
    for (const r of rows) expect(r).toHaveLength(CSV_HEADER.length);
    expect(rows[0][CSV_HEADER.indexOf('variation')]).toBe('Size: M');
    expect(rows[0][CSV_HEADER.indexOf('unit_price')]).toBe('599.00');
    expect(rows[1][CSV_HEADER.indexOf('payment_status')]).toBe('paid');
  });
});
