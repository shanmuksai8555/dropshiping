import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import CatalogNotice from '@/components/CatalogNotice';
import CategoryChips from '@/components/CategoryChips';
import ProductGrid from '@/components/ProductGrid';
import { listProducts } from '@/lib/catalog';
import { CATEGORIES } from '@/lib/categories';

export const revalidate = 300;
export const dynamicParams = false;
export const generateStaticParams = () => CATEGORIES.map((c) => ({ slug: c.slug }));

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const c = CATEGORIES.find((x) => x.slug === slug);
  return c ? { title: c.name, description: c.line } : {};
}

export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const cat = CATEGORIES.find((c) => c.slug === slug);
  if (!cat) notFound();
  const { products, source, error } = await listProducts(slug);
  return (
    <main className="page">
      <div className="page__head">
        <span className="eyebrow">Category</span>
        <h1>{cat.name}</h1>
        <p>{cat.line}</p>
      </div>
      <CatalogNotice source={source} error={error} />
      <CategoryChips active={slug} />
      <ProductGrid products={products} />
    </main>
  );
}
