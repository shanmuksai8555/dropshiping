import 'server-only';
import { getProductForPricing } from './catalog';
import { toPaise } from './format';

// Server-side cart pricing. The client only sends ids and quantities; every price comes from
// WooCommerce (or the sample catalog). Client-sent prices are ignored entirely.

export type CartInput = { productId: number; variationId: number | null; qty: number };
export type PricedLine = CartInput & { name: string; sku: string; variationLabel: string | null; unitPrice: number; lineTotal: number };
export type PricedCart = { lines: PricedLine[]; totalRupees: number; totalPaise: number; sample: boolean };

export const MAX_LINES = 20;
export const MAX_QTY = 10;

export class CartError extends Error {}

export function parseCartInput(raw: unknown): CartInput[] {
  if (!Array.isArray(raw) || raw.length === 0) throw new CartError('Your cart is empty.');
  if (raw.length > MAX_LINES) throw new CartError(`At most ${MAX_LINES} different items per order.`);
  const seen = new Map<string, CartInput>();
  for (const r of raw) {
    const o = r as Record<string, unknown>;
    const productId = Number(o?.productId);
    const variationId = o?.variationId === null || o?.variationId === undefined ? null : Number(o.variationId);
    const qty = Number(o?.qty);
    if (!Number.isInteger(productId) || productId <= 0) throw new CartError('Invalid product in cart.');
    if (variationId !== null && (!Number.isInteger(variationId) || variationId <= 0)) throw new CartError('Invalid product option in cart.');
    if (!Number.isInteger(qty) || qty < 1 || qty > MAX_QTY) throw new CartError(`Quantity must be between 1 and ${MAX_QTY}.`);
    const k = `${productId}:${variationId ?? 0}`;
    const prev = seen.get(k);
    if (prev) prev.qty = Math.min(MAX_QTY, prev.qty + qty);
    else seen.set(k, { productId, variationId, qty });
  }
  return [...seen.values()];
}

export async function priceCart(items: CartInput[]): Promise<PricedCart> {
  const lines: PricedLine[] = [];
  let sample = false;
  for (const it of items) {
    const p = await getProductForPricing(it.productId);
    if (!p || !p.purchasable) throw new CartError('An item in your cart is no longer available.');
    if (p.sample) sample = true;
    let unit = p.price;
    let sku = p.sku;
    let label: string | null = null;
    if (p.type === 'variable') {
      const v = p.variations.find((x) => x.id === it.variationId);
      if (!v || !v.purchasable) throw new CartError(`Please choose an available option for ${p.name}.`);
      if (!v.inStock) throw new CartError(`${p.name} (${Object.values(v.attributes).join(', ')}) is out of stock.`);
      unit = v.price;
      sku = v.sku || p.sku;
      label = Object.entries(v.attributes).map(([k, val]) => `${k}: ${val}`).join(', ');
    } else {
      if (it.variationId !== null) throw new CartError('Invalid product option in cart.');
      if (p.inStock === false) throw new CartError(`${p.name} is out of stock.`);
    }
    if (!(unit > 0)) throw new CartError(`${p.name} has no price set.`);
    lines.push({ ...it, name: p.name, sku, variationLabel: label, unitPrice: unit, lineTotal: Math.round(unit * it.qty * 100) / 100 });
  }
  const totalPaise = lines.reduce((s, l) => s + toPaise(l.unitPrice) * l.qty, 0);
  return { lines, totalPaise, totalRupees: totalPaise / 100, sample };
}
