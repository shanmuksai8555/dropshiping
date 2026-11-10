import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer__row">
        <span className="footer__mark">Lumen Market</span>
        <nav aria-label="Footer">
          <Link href="/shop">Shop</Link>
          <Link href="/#categories">Categories</Link>
          <Link href="/cart">Cart</Link>
          <Link href="/#join">WhatsApp</Link>
        </nav>
      </div>
      <p className="footer__small">© {new Date().getFullYear()} Lumen Market (placeholder name). Homepage imagery is illustrative; it does not show listed items.</p>
    </footer>
  );
}
