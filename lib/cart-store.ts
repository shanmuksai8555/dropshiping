'use client';
import { useSyncExternalStore } from 'react';
import type { CartItem } from './types';

// Client-side cart in localStorage. Prices here are display-only snapshots; the server re-prices
// everything at checkout from WooCommerce (or the sample catalog).

const KEY = 'lm-cart-v1';
const MAX_QTY = 10;
const EMPTY: CartItem[] = [];
let cache: CartItem[] | null = null;
const listeners = new Set<() => void>();

function read(): CartItem[] {
  if (cache) return cache;
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? '[]');
    cache = Array.isArray(raw) ? raw.filter((x) => x && Number.isInteger(x.productId) && Number.isInteger(x.qty) && x.qty > 0) : [];
  } catch {
    cache = [];
  }
  return cache!;
}
function write(next: CartItem[]) {
  cache = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* storage full / private mode: cart still works for this tab */
  }
  listeners.forEach((l) => l());
}
function subscribe(cb: () => void) {
  listeners.add(cb);
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) {
      cache = null;
      cb();
    }
  };
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(cb);
    window.removeEventListener('storage', onStorage);
  };
}

const same = (a: CartItem, productId: number, variationId: number | null) => a.productId === productId && a.variationId === variationId;

export const cart = {
  add(item: CartItem) {
    const cur = read();
    const i = cur.findIndex((x) => same(x, item.productId, item.variationId));
    if (i >= 0) write(cur.map((x, j) => (j === i ? { ...x, ...item, qty: Math.min(MAX_QTY, x.qty + item.qty) } : x)));
    else write([...cur, { ...item, qty: Math.min(MAX_QTY, item.qty) }]);
  },
  setQty(productId: number, variationId: number | null, qty: number) {
    const q = Math.max(0, Math.min(MAX_QTY, Math.floor(qty)));
    write(q === 0 ? read().filter((x) => !same(x, productId, variationId)) : read().map((x) => (same(x, productId, variationId) ? { ...x, qty: q } : x)));
  },
  remove(productId: number, variationId: number | null) {
    write(read().filter((x) => !same(x, productId, variationId)));
  },
  clear() {
    write([]);
  },
  MAX_QTY,
};

export const useCart = () => useSyncExternalStore(subscribe, read, () => EMPTY);
export const cartCount = (items: CartItem[]) => items.reduce((s, x) => s + x.qty, 0);
export const cartSubtotal = (items: CartItem[]) => items.reduce((s, x) => s + x.unitPrice * x.qty, 0);
