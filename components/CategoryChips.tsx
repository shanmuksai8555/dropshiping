import Link from 'next/link';
import { CATEGORIES } from '@/lib/categories';

export default function CategoryChips({ active }: { active?: string }) {
  return (
    <ul className="chips" aria-label="Filter by category">
      <li>
        <Link className="chip" href="/shop" aria-current={!active ? 'page' : undefined}>
          All
        </Link>
      </li>
      {CATEGORIES.map((c) => (
        <li key={c.slug}>
          <Link className="chip" href={`/category/${c.slug}`} aria-current={active === c.slug ? 'page' : undefined}>
            {c.name}
          </Link>
        </li>
      ))}
    </ul>
  );
}
