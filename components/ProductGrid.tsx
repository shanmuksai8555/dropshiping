import Link from 'next/link';
import type { Product } from '@/lib/types';
import Price from './Price';
import ProductImage from './ProductImage';

export default function ProductGrid({ products }: { products: Product[] }) {
  if (!products.length) return <p className="empty">No products here yet.</p>;
  return (
    <ul className="grid">
      {products.map((p, i) => (
        <li key={p.id}>
          <Link className="card" href={`/product/${p.slug}`}>
            <div className="card__media">
              {p.sample && <span className="badge">Sample</span>}
              {!p.sample && p.inStock === false && <span className="badge badge--muted">Out of stock</span>}
              <ProductImage image={p.images[0]} sizes="(max-width: 600px) 100vw, (max-width: 1100px) 50vw, 25vw" preload={i < 4} />
            </div>
            <div className="card__body">
              <span className="card__cat">{p.categories[0]?.name ?? ''}</span>
              <span className="card__name">{p.name}</span>
              <Price price={p.price} regularPrice={p.regularPrice} from={p.type === 'variable'} />
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
