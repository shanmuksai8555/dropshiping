// Shared, client-safe types. No secrets or server imports in this file.

export type CategorySlug = 'fashion' | 'electronics' | 'kitchenware' | 'daily-essentials';

export type ProductImage = { src: string; alt: string; width?: number; height?: number };

export type VariationAttribute = { name: string; options: string[] };

export type Variation = {
  id: number;
  /** attribute name -> option, e.g. { Size: 'M' } */
  attributes: Record<string, string>;
  price: number; // INR, rupees
  regularPrice: number | null;
  sku: string;
  purchasable: boolean;
  inStock: boolean;
};

export type Product = {
  id: number;
  slug: string;
  name: string;
  type: 'simple' | 'variable';
  price: number; // INR, rupees (for variable products: lowest variation price)
  regularPrice: number | null; // only when on sale
  sku: string;
  images: ProductImage[];
  categories: { slug: string; name: string }[];
  shortDescription: string; // plain text
  description: string; // plain text, paragraphs separated by \n\n
  attributes: VariationAttribute[]; // attributes used for variations
  variations: Variation[];
  purchasable: boolean;
  /** null when the source does not report stock (the sample catalog) */
  inStock: boolean | null;
  /** true for the built-in sample catalog */
  sample: boolean;
};

export type CatalogSource = 'woocommerce' | 'sample';

export type CartItem = {
  productId: number;
  variationId: number | null;
  qty: number;
  // display-only snapshot; the server always re-prices from the catalog
  name: string;
  slug: string;
  image: string | null;
  variationLabel: string | null;
  unitPrice: number;
  sample: boolean;
};
