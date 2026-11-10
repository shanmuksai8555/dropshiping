import type { WooOrder } from '@/lib/woo';

export const sampleWooOrder = (over: Partial<WooOrder> = {}): WooOrder => ({
  id: 1234,
  number: '1234',
  order_key: 'wc_order_abc123',
  status: 'processing',
  currency: 'INR',
  date_created: '2026-11-10T12:00:00',
  date_paid: '2026-11-10T12:00:05',
  total: '1847.00',
  payment_method: 'razorpay',
  payment_method_title: 'Razorpay',
  transaction_id: 'pay_TEST123456',
  billing: { first_name: 'Asha', last_name: 'Rao', address_1: '12, MG Road', address_2: 'Near "Big" Park, Block B', city: 'Bengaluru', state: 'KA', postcode: '560001', country: 'IN', email: 'asha@example.com', phone: '+919876543210' },
  shipping: { first_name: 'Asha', last_name: 'Rao', address_1: '12, MG Road', address_2: 'Near "Big" Park, Block B', city: 'Bengaluru', state: 'KA', postcode: '560001', country: 'IN', phone: '+919876543210' },
  line_items: [
    { id: 1, name: 'Cotton crew T-shirt - M', product_id: 9001, variation_id: 90012, quantity: 2, sku: 'TS-M', price: 599, total: '1198.00', meta_data: [{ key: 'size', value: 'M', display_key: 'Size', display_value: 'M' }] },
    { id: 2, name: 'Steel bottle', product_id: 9007, variation_id: 0, quantity: 1, sku: '', price: 649, total: '649.00' },
  ],
  meta_data: [],
  ...over,
});
