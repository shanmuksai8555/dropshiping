'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cartCount, useCart } from '@/lib/cart-store';

export default function SiteNav() {
  const home = usePathname() === '/';
  const n = cartCount(useCart());
  return (
    <header className={`nav${home ? '' : ' nav--solid'}`}>
      <Link className="nav__mark" href="/" aria-label="Lumen Market home">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="7.5" />
          <circle cx="12" cy="12" r="2.2" />
        </svg>
        <span>Lumen Market</span>
      </Link>
      <nav className="nav__links" aria-label="Main">
        <Link href="/shop">Shop</Link>
        <Link className="nav__hide-sm" href="/#categories">Categories</Link>
        <Link className="nav__cart" href="/cart" aria-label={`Cart, ${n} item${n === 1 ? '' : 's'}`}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M5 8h14l-1.2 11.1a2 2 0 0 1-2 1.9H8.2a2 2 0 0 1-2-1.9z" />
            <path d="M9 8V6a3 3 0 0 1 6 0v2" />
          </svg>
          {n > 0 && <span className="nav__badge">{n}</span>}
        </Link>
        <Link className="nav__cta" href="/#join">
          <span className="nav__cta-long">Join on WhatsApp</span>
          <span className="nav__cta-short">Join</span>
        </Link>
      </nav>
    </header>
  );
}
