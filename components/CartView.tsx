'use client';
import Link from 'next/link';
import { cart, cartSubtotal, useCart } from '@/lib/cart-store';
import { formatINR } from '@/lib/format';
import ProductImage from './ProductImage';

export default function CartView() {
  const items = useCart();
  if (!items.length)
    return (
      <div className="empty">
        <p>Your cart is empty.</p>
        <Link className="btn btn--gold" href="/shop">
          Browse the shop
        </Link>
      </div>
    );
  const sample = items.some((i) => i.sample);
  return (
    <div className="cart">
      <ul className="cart__lines">
        {items.map((it) => (
          <li className="line" key={`${it.productId}:${it.variationId ?? 0}`}>
            <div className="line__img">{it.image && <ProductImage image={{ src: it.image, alt: '' }} sizes="88px" />}</div>
            <div>
              <Link className="line__name" href={`/product/${it.slug}`}>
                {it.name}
              </Link>
              <div className="line__meta">
                {[it.variationLabel, it.sample ? 'Sample item' : null, `${formatINR(it.unitPrice)} each`].filter(Boolean).join(' · ')}
              </div>
              <div className="line__ctrl">
                <div className="qty">
                  <button type="button" aria-label={`Decrease quantity of ${it.name}`} onClick={() => cart.setQty(it.productId, it.variationId, it.qty - 1)}>−</button>
                  <output>{it.qty}</output>
                  <button type="button" aria-label={`Increase quantity of ${it.name}`} disabled={it.qty >= cart.MAX_QTY} onClick={() => cart.setQty(it.productId, it.variationId, it.qty + 1)}>+</button>
                </div>
                <button type="button" className="line__remove" onClick={() => cart.remove(it.productId, it.variationId)}>
                  Remove
                </button>
              </div>
            </div>
            <span className="line__total">{formatINR(it.unitPrice * it.qty)}</span>
          </li>
        ))}
      </ul>
      <aside className="summary" aria-label="Order summary">
        <h2>Summary</h2>
        <div className="summary__row summary__row--total">
          <span>Subtotal</span>
          <span>{formatINR(cartSubtotal(items))}</span>
        </div>
        <p className="summary__note">Prices are checked again when you pay.{sample ? ' Your cart contains sample items, which are for preview only.' : ''}</p>
        <Link className="btn btn--gold btn--block" href="/checkout">
          Continue to checkout
        </Link>
        <Link className="link" href="/shop">
          Keep shopping
        </Link>
      </aside>
    </div>
  );
}
