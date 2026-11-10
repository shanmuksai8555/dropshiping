import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { razorpayConfig } from '@/lib/env';
import { formatINR } from '@/lib/format';
import { fetchRzpOrder, isRzpOrderId } from '@/lib/razorpay';
import { safeEqual } from '@/lib/signatures';
import { isWooConfigured, wooGetOrder, type WooOrder } from '@/lib/woo';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Thank you', robots: { index: false } };

type Props = { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

const STATUS_TEXT: Record<string, string> = {
  processing: 'Paid. Your order is being prepared.',
  'on-hold': 'Payment authorised. We will confirm your order shortly.',
  completed: 'Completed.',
  pending: 'Waiting for payment.',
};

export default async function OrderPage({ params, searchParams }: Props) {
  const { id } = await params;
  const sp = await searchParams;

  if (id === 'sample') {
    const ref = typeof sp.ref === 'string' ? sp.ref : '';
    let paid = false;
    if (isRzpOrderId(ref) && razorpayConfig()) {
      try {
        paid = (await fetchRzpOrder(ref)).status === 'paid';
      } catch {
        /* show the generic message */
      }
    }
    return (
      <main className="page">
        <div className="thanks">
          <span className="eyebrow">Sample checkout</span>
          <h1>{paid ? 'Test payment received.' : 'Checkout finished.'}</h1>
          <p>This store is running on the sample catalog, so no WooCommerce order was created and nothing will be shipped.</p>
          {ref && <p className="field__hint">Razorpay order reference: {ref}</p>}
          <Link className="btn btn--gold" href="/shop">Back to the shop</Link>
        </div>
      </main>
    );
  }

  // Woo order: require the order key so order ids can't be enumerated.
  const num = Number(id);
  const key = typeof sp.key === 'string' ? sp.key : '';
  if (!Number.isInteger(num) || num <= 0 || !key || !isWooConfigured()) notFound();
  let order: WooOrder;
  try {
    order = await wooGetOrder(num);
  } catch {
    notFound();
  }
  if (!safeEqual(order.order_key, key)) notFound();

  return (
    <main className="page">
      <div className="thanks">
        <span className="eyebrow">Order #{order.number}</span>
        <h1>Thank you, {order.billing.first_name || 'friend'}.</h1>
        <p>{STATUS_TEXT[order.status] ?? `Status: ${order.status}.`}</p>
        <dl className="kv">
          <dt>Order</dt>
          <dd>#{order.number}</dd>
          <dt>Total</dt>
          <dd>{formatINR(Number(order.total))}</dd>
          <dt>Payment</dt>
          <dd>{order.payment_method_title || order.payment_method}</dd>
          <dt>Ship to</dt>
          <dd>{[order.shipping.city, order.shipping.state, order.shipping.postcode].filter(Boolean).join(', ')}</dd>
        </dl>
        <ul className="summary__lines">
          {order.line_items.map((li) => (
            <li key={li.id}>
              <span>
                {li.name} × {li.quantity}
              </span>
              <span>{formatINR(Number(li.total))}</span>
            </li>
          ))}
        </ul>
        <p className="field__hint">Keep your order number for any questions about this order.</p>
        <Link className="btn btn--ghost" href="/shop">Continue shopping</Link>
      </div>
    </main>
  );
}
