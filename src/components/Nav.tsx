import { SHOP_URL } from '../lib/links';

export default function Nav() {
  return (
    <header className="nav">
      <a className="nav__mark" href={import.meta.env.BASE_URL} aria-label="Lumen Market home">
        <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="7.5" /><circle cx="12" cy="12" r="2.2" /></svg>
        <span>Lumen Market</span>
      </a>
      <nav className="nav__links" aria-label="Main">
        <a href={SHOP_URL}>Shop</a>
        <a href="#categories">Categories</a>
        <a className="nav__cta" href="#join">
          <span className="nav__cta-long">Join on WhatsApp</span>
          <span className="nav__cta-short">Join</span>
        </a>
      </nav>
    </header>
  );
}
