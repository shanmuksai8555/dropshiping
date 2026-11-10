import 'server-only';
import { SAMPLE_PRODUCTS } from './sample-products';
import type { CatalogSource, Product } from './types';
import { isWooConfigured, wooGetProductBySlug, wooGetProductForPricing, wooListProducts } from './woo';

// Single entry point for product data. WooCommerce when WOO_* is set, otherwise the labelled SAMPLE catalog.

export const catalogSource = (): CatalogSource => (isWooConfigured() ? 'woocommerce' : 'sample');

export type ListResult = { products: Product[]; source: CatalogSource; error?: string };

export async function listProducts(categorySlug?: string): Promise<ListResult> {
  if (!isWooConfigured()) {
    const products = categorySlug ? SAMPLE_PRODUCTS.filter((p) => p.categories.some((c) => c.slug === categorySlug)) : SAMPLE_PRODUCTS;
    return { products, source: 'sample' };
  }
  try {
    return { products: await wooListProducts({ categorySlug }), source: 'woocommerce' };
  } catch (e) {
    console.error('[catalog] list failed:', (e as Error).message);
    return { products: [], source: 'woocommerce', error: 'The catalog could not be loaded right now.' };
  }
}

export async function getProduct(slug: string): Promise<{ product: Product | null; source: CatalogSource; error?: string }> {
  if (!isWooConfigured()) return { product: SAMPLE_PRODUCTS.find((p) => p.slug === slug) ?? null, source: 'sample' };
  try {
    return { product: await wooGetProductBySlug(slug), source: 'woocommerce' };
  } catch (e) {
    console.error('[catalog] product failed:', (e as Error).message);
    return { product: null, source: 'woocommerce', error: 'This product could not be loaded right now.' };
  }
}

/** Fresh, uncached product read for server-side pricing. Throws on upstream errors. */
export async function getProductForPricing(id: number): Promise<Product | null> {
  if (!isWooConfigured()) return SAMPLE_PRODUCTS.find((p) => p.id === id) ?? null;
  return wooGetProductForPricing(id);
}
