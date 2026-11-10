import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="page">
      <div className="thanks">
        <span className="eyebrow">404</span>
        <h1>Nothing here.</h1>
        <p>The page you’re looking for doesn’t exist or has moved.</p>
        <Link className="btn btn--gold" href="/shop">Go to the shop</Link>
      </div>
    </main>
  );
}
