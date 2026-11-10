import type { Metadata } from 'next';
import CatalogNotice from '@/components/CatalogNotice';
import CategoryChips from '@/components/CategoryChips';
import ProductGrid from '@/components/ProductGrid';
import { listProducts } from '@/lib/catalog';

export const revalidate = 300;
export const metadata: Metadata = { title: 'Shop', description: 'Fashion, electronics, kitchenware and daily essentials.' };

export default async function ShopPage() {
  const { products, source, error } = await listProducts();
  return (
    <main className="page">
      <div className="page__head">
        <span className="eyebrow">Shop</span>
        <h1>Everything in the store.</h1>
      </div>
      <CatalogNotice source={source} error={error} />
      <CategoryChips />
      <ProductGrid products={products} />
    </main>
  );
}
