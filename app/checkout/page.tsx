import type { Metadata } from 'next';
import CheckoutForm, { type PaymentsMode } from '@/components/CheckoutForm';
import { catalogSource } from '@/lib/catalog';
import { razorpayConfig } from '@/lib/env';

export const dynamic = 'force-dynamic'; // reflects server env at request time
export const metadata: Metadata = { title: 'Checkout', robots: { index: false } };

export default function CheckoutPage() {
  const rzp = razorpayConfig();
  const mode: PaymentsMode = !rzp ? 'not_configured' : catalogSource() === 'sample' && !rzp.testMode ? 'catalog_missing' : rzp.testMode ? 'test' : 'live';
  return (
    <main className="page">
      <div className="page__head">
        <span className="eyebrow">Checkout</span>
        <h1>Delivery and payment.</h1>
      </div>
      <CheckoutForm mode={mode} />
    </main>
  );
}
