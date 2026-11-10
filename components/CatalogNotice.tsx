import type { CatalogSource } from '@/lib/types';

export default function CatalogNotice({ source, error }: { source: CatalogSource; error?: string }) {
  if (error)
    return (
      <p className="notice notice--warn" role="alert">
        <span className="notice__tag">Offline</span>
        <span>{error} Please try again in a moment.</span>
      </p>
    );
  if (source !== 'sample') return null;
  return (
    <p className="notice">
      <span className="notice__tag">Sample</span>
      <span>
        <strong>These are sample products and prices for previewing the store.</strong> They are not real listings. Connect WooCommerce (see README) to show the real catalog.
      </span>
    </p>
  );
}
