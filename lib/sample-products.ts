// Built-in SAMPLE catalog, used only when WooCommerce is not configured (WOO_URL etc. unset).
// Every item is generic and labelled "Sample" in the UI. Prices are placeholders, not offers.
// No stock levels, ratings, reviews or delivery promises are modelled on purpose.
import type { CategorySlug, Product, Variation } from './types';

const CAT_NAMES: Record<CategorySlug, string> = {
  fashion: 'Fashion',
  electronics: 'Electronics',
  kitchenware: 'Kitchenware',
  'daily-essentials': 'Daily Essentials',
};

type Seed = {
  id: number;
  slug: string;
  name: string;
  cat: CategorySlug;
  price: number;
  short: string;
  description: string;
  variations?: { attr: string; options: { value: string; price: number }[] };
};

const SEEDS: Seed[] = [
  { id: 9001, slug: 'sample-cotton-crew-tshirt', name: 'Cotton crew T-shirt', cat: 'fashion', price: 599,
    short: 'A plain crew-neck T-shirt in cotton jersey.',
    description: 'Sample item for previewing the storefront. A plain crew-neck T-shirt.\n\nReplace this with your real WooCommerce catalog by setting WOO_URL.',
    variations: { attr: 'Size', options: [{ value: 'S', price: 599 }, { value: 'M', price: 599 }, { value: 'L', price: 599 }, { value: 'XL', price: 649 }] } },
  { id: 9002, slug: 'sample-canvas-tote', name: 'Canvas tote bag', cat: 'fashion', price: 449,
    short: 'An everyday tote in heavy canvas.', description: 'Sample item for previewing the storefront. An everyday tote bag in canvas.' },
  { id: 9003, slug: 'sample-card-wallet', name: 'Slim card wallet', cat: 'fashion', price: 799,
    short: 'A slim wallet for a few cards and notes.', description: 'Sample item for previewing the storefront. A slim card wallet.' },
  { id: 9004, slug: 'sample-wireless-earbuds', name: 'Wireless earbuds', cat: 'electronics', price: 1499,
    short: 'True-wireless earbuds with a charging case.', description: 'Sample item for previewing the storefront. Wireless earbuds with a charging case.' },
  { id: 9005, slug: 'sample-usb-c-charger', name: 'USB-C wall charger', cat: 'electronics', price: 699,
    short: 'A compact USB-C wall charger.', description: 'Sample item for previewing the storefront. A compact USB-C wall charger.' },
  { id: 9006, slug: 'sample-bluetooth-speaker', name: 'Portable Bluetooth speaker', cat: 'electronics', price: 1999,
    short: 'A small speaker for the desk or a bag.', description: 'Sample item for previewing the storefront. A portable Bluetooth speaker.' },
  { id: 9007, slug: 'sample-steel-bottle', name: 'Stainless steel bottle', cat: 'kitchenware', price: 549,
    short: 'A stainless steel water bottle with a screw cap.',
    description: 'Sample item for previewing the storefront. A stainless steel water bottle.',
    variations: { attr: 'Capacity', options: [{ value: '750 ml', price: 549 }, { value: '1 L', price: 649 }] } },
  { id: 9008, slug: 'sample-cast-iron-tawa', name: 'Cast-iron tawa', cat: 'kitchenware', price: 1199,
    short: 'A flat cast-iron griddle for rotis and dosas.', description: 'Sample item for previewing the storefront. A cast-iron tawa.' },
  { id: 9009, slug: 'sample-bamboo-board', name: 'Bamboo chopping board', cat: 'kitchenware', price: 499,
    short: 'A bamboo board for everyday chopping.', description: 'Sample item for previewing the storefront. A bamboo chopping board.' },
  { id: 9010, slug: 'sample-cotton-towel', name: 'Cotton bath towel', cat: 'daily-essentials', price: 399,
    short: 'A cotton bath towel.', description: 'Sample item for previewing the storefront. A cotton bath towel.' },
  { id: 9011, slug: 'sample-glass-jars', name: 'Glass storage jars, set of 3', cat: 'daily-essentials', price: 699,
    short: 'Three glass jars with lids for the pantry.', description: 'Sample item for previewing the storefront. A set of three glass storage jars.' },
  { id: 9012, slug: 'sample-steel-lunch-box', name: 'Steel lunch box', cat: 'daily-essentials', price: 649,
    short: 'A two-tier stainless steel lunch box.', description: 'Sample item for previewing the storefront. A stainless steel lunch box.' },
];

function build(seed: Seed): Product {
  const images = [1, 2].map((n) => ({
    src: `/sample/${seed.slug}-${n}.svg`,
    alt: `${seed.name}, sample placeholder image ${n}`,
    width: 1200,
    height: 1200,
  }));
  const variations: Variation[] = (seed.variations?.options ?? []).map((o, i) => ({
    id: seed.id * 10 + i + 1,
    attributes: { [seed.variations!.attr]: o.value },
    price: o.price,
    regularPrice: null,
    sku: `SAMPLE-${seed.id}-${o.value.replace(/\W+/g, '').toUpperCase()}`,
    purchasable: true,
    inStock: true,
  }));
  return {
    id: seed.id,
    slug: seed.slug,
    name: seed.name,
    type: variations.length ? 'variable' : 'simple',
    price: variations.length ? Math.min(...variations.map((v) => v.price)) : seed.price,
    regularPrice: null,
    sku: `SAMPLE-${seed.id}`,
    images,
    categories: [{ slug: seed.cat, name: CAT_NAMES[seed.cat] }],
    shortDescription: seed.short,
    description: seed.description,
    attributes: seed.variations ? [{ name: seed.variations.attr, options: seed.variations.options.map((o) => o.value) }] : [],
    variations,
    purchasable: true,
    inStock: null,
    sample: true,
  };
}

export const SAMPLE_PRODUCTS: Product[] = SEEDS.map(build);
export const SAMPLE_SEEDS_FOR_IMAGES = SEEDS.map((s) => ({ slug: s.slug, name: s.name, cat: s.cat }));
