import { formatINR } from '@/lib/format';

export default function Price({ price, regularPrice, from }: { price: number; regularPrice?: number | null; from?: boolean }) {
  return (
    <span className="price">
      {from && <span className="price__from">From</span>}
      <span className="price__now">{formatINR(price)}</span>
      {regularPrice && regularPrice > price ? (
        <span className="price__was">
          <span className="visually-hidden">Was </span>
          {formatINR(regularPrice)}
        </span>
      ) : null}
    </span>
  );
}
