import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import CatalogNotice from '@/components/CatalogNotice';
import ProductDetail from '@/components/ProductDetail';
import { getProduct, listProducts } from '@/lib/catalog';

export const revalidate = 300;
export const dynamicParams = true; // new Woo products render on first request, then are cached

export async function generateStaticParams() {
  // If WooCommerce is unreachable at build time (e.g. LocalWP from Vercel), build with no product
  // pages pre-rendered rather than failing; they render on demand.
  const { products } = await listProducts();
  return products.slice(0, 200).map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const { product } = await getProduct(slug);
  if (!product) return {};
  return { title: product.name, description: product.shortDescription.slice(0, 160) || undefined };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!/^[\w-]{1,200}$/.test(slug)) notFound();
  const { product, source, error } = await getProduct(slug);
  if (error) {
    return (
      <main className="page">
        <CatalogNotice source={source} error={error} />
      </main>
    );
  }
  if (!product) notFound();
  const cat = product.categories[0];
  return (
    <main className="page">
      <p className="crumbs">
        <Link href="/shop">Shop</Link>
        {cat && (
          <>
            {' / '}
            <Link href={`/category/${cat.slug}`}>{cat.name}</Link>
          </>
        )}
      </p>
      {product.sample && <CatalogNotice source="sample" />}
      <ProductDetail product={product} />
    </main>
  );
}
