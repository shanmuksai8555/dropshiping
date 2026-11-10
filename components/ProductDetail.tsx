'use client';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { cart } from '@/lib/cart-store';
import type { Product } from '@/lib/types';
import Price from './Price';
import ProductImage from './ProductImage';

export default function ProductDetail({ product: p }: { product: Product }) {
  const [imgIdx, setImgIdx] = useState(0);
  const [sel, setSel] = useState<Record<string, string>>(() => {
    // preselect single-option attributes
    const s: Record<string, string> = {};
    for (const a of p.attributes) if (a.options.length === 1) s[a.name] = a.options[0];
    return s;
  });
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);

  // An attribute value of "" on a variation means "any value" in WooCommerce.
  const matches = (attrs: Record<string, string>, s: Record<string, string>) => Object.entries(s).every(([k, v]) => !attrs[k] || attrs[k] === v);
  const variation = useMemo(() => {
    if (p.type !== 'variable') return null;
    if (p.attributes.some((a) => !sel[a.name])) return null;
    return p.variations.find((v) => matches(v.attributes, sel)) ?? null;
  }, [p, sel]);

  const optionAvailable = (name: string, option: string) => p.variations.some((v) => v.purchasable && v.inStock && matches(v.attributes, { ...sel, [name]: option }));

  const needsChoice = p.type === 'variable' && !variation;
  const outOfStock = p.type === 'variable' ? variation ? !variation.inStock || !variation.purchasable : false : p.inStock === false;
  const canBuy = p.purchasable && !needsChoice && !outOfStock;
  const price = variation?.price ?? p.price;
  const regular = variation ? variation.regularPrice : p.regularPrice;

  const add = () => {
    if (!canBuy) return;
    cart.add({
      productId: p.id,
      variationId: variation?.id ?? null,
      qty,
      name: p.name,
      slug: p.slug,
      image: p.images[0]?.src ?? null,
      variationLabel: variation ? Object.entries(variation.attributes).map(([k, v]) => `${k}: ${v || sel[k]}`).join(', ') : null,
      unitPrice: price,
      sample: p.sample,
    });
    setAdded(true);
  };

  const images = p.images.length ? p.images : [];
  return (
    <div className="pdp">
      <div className="gallery">
        <div className="gallery__main">
          {p.sample && <span className="badge">Sample</span>}
          <ProductImage image={images[imgIdx]} sizes="(max-width: 900px) 100vw, 55vw" preload />
        </div>
        {images.length > 1 && (
          <ul className="gallery__thumbs" aria-label="Product images">
            {images.map((im, i) => (
              <li key={im.src}>
                <button type="button" aria-current={i === imgIdx} aria-label={`Show image ${i + 1}`} onClick={() => setImgIdx(i)}>
                  <ProductImage image={im} sizes="76px" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="pdp__info">
        <span className="eyebrow">{p.categories[0]?.name ?? 'Product'}{p.sample ? ' · Sample' : ''}</span>
        <h1>{p.name}</h1>
        <div className="pdp__price">
          <Price price={price} regularPrice={regular} from={p.type === 'variable' && !variation} />
        </div>
        {p.shortDescription && <p className="pdp__short">{p.shortDescription}</p>}

        {p.attributes.length > 0 && (
          <div className="opts">
            {p.attributes.map((a) => (
              <fieldset key={a.name} className="opt">
                <legend>{a.name}</legend>
                <div className="opt__list">
                  {a.options.map((o) => (
                    <button key={o} type="button" className="opt__btn" aria-pressed={sel[a.name] === o} disabled={!optionAvailable(a.name, o)} onClick={() => { setSel({ ...sel, [a.name]: o }); setAdded(false); }}>
                      {o}
                    </button>
                  ))}
                </div>
              </fieldset>
            ))}
          </div>
        )}

        {!p.sample && outOfStock && <span className="pdp__stock">Out of stock</span>}

        <div className="pdp__buy">
          <div>
            <div className="qty__label">Quantity</div>
            <div className="qty">
              <button type="button" aria-label="Decrease quantity" disabled={qty <= 1} onClick={() => setQty(qty - 1)}>−</button>
              <output aria-live="polite">{qty}</output>
              <button type="button" aria-label="Increase quantity" disabled={qty >= cart.MAX_QTY} onClick={() => setQty(qty + 1)}>+</button>
            </div>
          </div>
          <button type="button" className="btn btn--gold" disabled={!canBuy} onClick={add}>
            {needsChoice ? `Choose ${p.attributes.filter((a) => !sel[a.name]).map((a) => a.name.toLowerCase()).join(' and ')}` : outOfStock ? 'Unavailable' : 'Add to cart'}
          </button>
        </div>
        {added && (
          <p className="added" role="status">
            Added to your cart. <Link href="/cart">View cart →</Link>
          </p>
        )}

        {p.description && (
          <div className="pdp__desc">
            {p.description.split(/\n{2,}/).map((para, i) => (
              <p key={i}>{para}</p>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
