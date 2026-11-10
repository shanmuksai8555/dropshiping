import type { CategorySlug } from './types';

export const CATEGORIES: { slug: CategorySlug; name: string; line: string }[] = [
  { slug: 'fashion', name: 'Fashion', line: 'Clothes and accessories that stay in rotation.' },
  { slug: 'electronics', name: 'Electronics', line: 'Gadgets that earn their charger.' },
  { slug: 'kitchenware', name: 'Kitchenware', line: 'Tools for the counter, not the drawer.' },
  { slug: 'daily-essentials', name: 'Daily Essentials', line: 'The things you run out of. Restocked.' },
];

export const isCategorySlug = (s: string): s is CategorySlug => CATEGORIES.some((c) => c.slug === s);
