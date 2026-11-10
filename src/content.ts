// All homepage copy lives here. Nothing in this file is a business fact: no prices, ratings,
// order counts or delivery promises. The watch is an illustrative concept render, not a product.

export type Chapter = { n: string; title: string; body: string; from: number; to: number };

export const CHAPTERS: Chapter[] = [
  { n: '01', title: 'Built to last', body: 'One case, milled to a single idea. Fewer seams. Fewer excuses.', from: 22, to: 60 },
  { n: '02', title: 'Comfort', body: 'A soft band that stays out of the way. That is the whole job.', from: 66, to: 106 },
  { n: '03', title: 'Inside', body: 'Glass, display, board, battery. Everything has a place, and stays in it.', from: 112, to: 178 },
  { n: '04', title: 'Ready to ship', body: 'Put back together and handed to our fulfilment partner. Then it is on its way to you.', from: 190, to: 239 },
];

export const CATEGORIES = [
  { slug: 'fashion', name: 'Fashion', line: 'Clothes and accessories that stay in rotation.' },
  { slug: 'electronics', name: 'Electronics', line: 'Gadgets that earn their charger.' },
  { slug: 'kitchenware', name: 'Kitchenware', line: 'Tools for the counter, not the drawer.' },
  { slug: 'daily-essentials', name: 'Daily Essentials', line: 'The things you run out of. Restocked.' },
] as const;

export const STEPS = [
  { n: '01', title: 'You order', body: 'Pick what you like in the shop and check out.' },
  { n: '02', title: 'Our partner packs it', body: 'Your order goes straight to our fulfilment partner, who packs and dispatches it.' },
  { n: '03', title: 'It is delivered', body: 'It travels to the address you gave at checkout.' },
];
