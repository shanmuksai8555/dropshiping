// Encodes the server-validated checkout (customer + priced lines) into Razorpay order notes, so both the
// browser callback (/api/checkout/verify) and the webhook (/api/razorpay/webhook) can rebuild the exact
// order that was paid for, from Razorpay's copy, without trusting anything the browser sends later.
// Razorpay allows at most 15 note keys of up to 256 characters each.

export const NOTE_SOURCE = 'lumen-storefront';

export type Customer = {
  name: string;
  phone: string; // +91XXXXXXXXXX
  email: string;
  address1: string;
  address2: string;
  city: string;
  state: string; // WooCommerce state code, e.g. MH
  pincode: string;
};
export type SnapshotLine = { productId: number; variationId: number | null; qty: number; unitPaise: number };

const ITEM_KEYS = ['items', 'items2', 'items3'];

export function encodeSnapshot(c: Customer, lines: SnapshotLine[], sample: boolean): Record<string, string> {
  const enc = lines.map((l) => `${l.productId}:${l.variationId ?? 0}:${l.qty}:${l.unitPaise}`);
  const notes: Record<string, string> = {
    src: NOTE_SOURCE,
    sample: sample ? '1' : '0',
    name: c.name.slice(0, 80),
    phone: c.phone,
    email: c.email.slice(0, 120),
    a1: c.address1.slice(0, 200),
    a2: c.address2.slice(0, 200),
    city: c.city.slice(0, 80),
    state: c.state,
    pin: c.pincode,
  };
  let k = 0;
  let cur: string[] = [];
  for (const e of enc) {
    if ([...cur, e].join(',').length > 250) {
      if (k >= ITEM_KEYS.length - 1) throw new Error('Too many items for one order.');
      notes[ITEM_KEYS[k++]] = cur.join(',');
      cur = [];
    }
    cur.push(e);
  }
  notes[ITEM_KEYS[k]] = cur.join(',');
  return notes;
}

export function decodeSnapshot(notes: Record<string, string>): { customer: Customer; lines: SnapshotLine[]; sample: boolean } | null {
  if (notes.src !== NOTE_SOURCE) return null;
  const raw = ITEM_KEYS.map((k) => notes[k]).filter(Boolean).join(',');
  const lines: SnapshotLine[] = [];
  for (const part of raw.split(',').filter(Boolean)) {
    const [p, v, q, u] = part.split(':').map(Number);
    if (![p, v, q, u].every(Number.isInteger)) return null;
    lines.push({ productId: p, variationId: v || null, qty: q, unitPaise: u });
  }
  if (!lines.length) return null;
  return {
    sample: notes.sample === '1',
    lines,
    customer: {
      name: notes.name ?? '',
      phone: notes.phone ?? '',
      email: notes.email ?? '',
      address1: notes.a1 ?? '',
      address2: notes.a2 ?? '',
      city: notes.city ?? '',
      state: notes.state ?? '',
      pincode: notes.pin ?? '',
    },
  };
}

export function splitName(full: string): { first: string; last: string } {
  const parts = full.trim().split(/\s+/);
  if (parts.length === 1) return { first: parts[0], last: '' };
  return { first: parts.slice(0, -1).join(' '), last: parts[parts.length - 1] };
}
