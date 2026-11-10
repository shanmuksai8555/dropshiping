import type { ReactNode } from 'react';
import { CATEGORIES, STEPS } from '../content';
import { SHOP_URL, shopCategoryUrl } from '../lib/links';

const ICONS: Record<string, ReactNode> = {
  fashion: <path d="M9 4l3 2 3-2 5 3-2 4-2-1v10H8V10l-2 1-2-4z" />,
  electronics: <><rect x="4" y="5" width="16" height="11" rx="2" /><path d="M9 20h6M12 16v4" /></>,
  kitchenware: <><path d="M5 11h14v3a5 5 0 0 1-5 5h-4a5 5 0 0 1-5-5z" /><path d="M19 12h2M9 8c0-2 2-2 2-4M13 8c0-2 2-2 2-4" /></>,
  'daily-essentials': <><path d="M8 3h8l-1 4H9z" /><rect x="7" y="7" width="10" height="14" rx="3" /><path d="M10 13h4" /></>,
};

export function Categories() {
  return (
    <section className="section categories" id="categories" aria-labelledby="cat-h">
      <div className="section__head">
        <span className="eyebrow">Categories</span>
        <h2 id="cat-h">Four aisles. No clutter.</h2>
      </div>
      <ul className="cat-grid">
        {CATEGORIES.map((c, i) => (
          <li key={c.slug}>
            <a className="cat" href={shopCategoryUrl(c.slug)}>
              <span className="cat__n">0{i + 1}</span>
              <svg className="cat__icon" viewBox="0 0 24 24" aria-hidden="true">{ICONS[c.slug]}</svg>
              <span className="cat__name">{c.name}</span>
              <span className="cat__line">{c.line}</span>
              <span className="cat__go" aria-hidden="true">Browse →</span>
            </a>
          </li>
        ))}
      </ul>
      <p className="section__foot"><a className="link" href={SHOP_URL}>See everything in the shop →</a></p>
    </section>
  );
}

export function HowItWorks() {
  return (
    <section className="section how" aria-labelledby="how-h">
      <div className="section__head">
        <span className="eyebrow">How it works</span>
        <h2 id="how-h">Three steps. We handle the middle one.</h2>
      </div>
      <ol className="how__steps">
        {STEPS.map((s) => (
          <li key={s.n} className="step">
            <span className="step__n">{s.n}</span>
            <h3>{s.title}</h3>
            <p>{s.body}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

export function Footer() {
  return (
    <footer className="footer">
      <div className="footer__row">
        <span className="footer__mark">Lumen Market</span>
        <nav aria-label="Footer">
          <a href={SHOP_URL}>Shop</a>
          <a href="#categories">Categories</a>
          <a href="#join">WhatsApp</a>
        </nav>
      </div>
      <p className="footer__small">
        © {new Date().getFullYear()} Lumen Market (placeholder name). Imagery is illustrative; none of these are listed items.
      </p>
    </footer>
  );
}
