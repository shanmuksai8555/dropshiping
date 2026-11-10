import Link from 'next/link';
import CategoryIcon from '@/components/CategoryIcon';
import { CATEGORIES } from '@/lib/categories';
import { STEPS } from '@/lib/home-content';

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
            <Link className="cat" href={`/category/${c.slug}`}>
              <span className="cat__n">0{i + 1}</span>
              <CategoryIcon slug={c.slug} className="cat__icon" />
              <span className="cat__name">{c.name}</span>
              <span className="cat__line">{c.line}</span>
              <span className="cat__go" aria-hidden="true">
                Browse →
              </span>
            </Link>
          </li>
        ))}
      </ul>
      <p className="section__foot">
        <Link className="link" href="/shop">
          See everything in the shop →
        </Link>
      </p>
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
