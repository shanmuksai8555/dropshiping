// All homepage copy. Nothing here is a business fact: no prices, ratings, order counts or delivery
// promises. The product films are illustrative, not listed items.

export type Chapter = { n: string; title: string; body: string; from: number; to: number };

export const CHAPTERS: Chapter[] = [
  { n: '01', title: 'Fashion', body: 'Cut and stitched. Meant to be worn often.', from: 18, to: 52 },
  { n: '02', title: 'Electronics', body: 'Quiet objects. They do the work.', from: 68, to: 112 },
  { n: '03', title: 'Kitchenware', body: 'For the counter, not the cupboard.', from: 128, to: 172 },
  { n: '04', title: 'Daily Essentials', body: 'The ordinary things, done properly.', from: 188, to: 239 },
];

export const STEPS = [
  { n: '01', title: 'You order', body: 'Pick what you like in the shop and check out.' },
  { n: '02', title: 'Our partner packs it', body: 'Your order goes straight to our fulfilment partner, who packs and dispatches it.' },
  { n: '03', title: 'It is delivered', body: 'It travels to the address you gave at checkout.' },
];
