import type { Metadata } from 'next';
import CartView from '@/components/CartView';

export const metadata: Metadata = { title: 'Cart' };

export default function CartPage() {
  return (
    <main className="page">
      <div className="page__head">
        <span className="eyebrow">Cart</span>
        <h1>Your cart.</h1>
      </div>
      <CartView />
    </main>
  );
}
