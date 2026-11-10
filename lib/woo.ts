import 'server-only';
import { createHmac, randomBytes } from 'node:crypto';
import { wooConfig } from './env';
import type { Product, Variation } from './types';

// WooCommerce REST API v3 client. Server-only: the consumer key/secret never reach the browser.
//
// Auth:
//  * https://...           -> HTTP Basic auth (WooCommerce's recommended method over TLS).
//  * http://localhost, http://127.0.0.1, http://*.local (LocalWP) -> OAuth 1.0a one-legged signature
//    in the query string. WooCommerce ignores consumer_key/consumer_secret query params over plain
//    HTTP (it only accepts them when is_ssl()), so query-string keys alone fail with
//    "woocommerce_rest_authentication_error". Set WOO_AUTH_MODE=query to force plain query-string keys
//    (e.g. when WordPress sees the request as https behind a proxy), or WOO_AUTH_MODE=basic.
//  * Any other http:// URL is refused, so keys are never sent in clear text over the internet.

export const REVALIDATE_SECONDS = 300;
export const CATALOG_TAG = 'woo-catalog';

export class WooError extends Error {
  constructor(message: string, public status: number, public code?: string) {
    super(message);
  }
}

const isLocalHost = (h: string) => /^(localhost|127\.0\.0\.1|\[::1\])$/.test(h) || h.endsWith('.local');

const rfc3986 = (s: string) => encodeURIComponent(s).replace(/[!'()*]/g, (c) => '%' + c.charCodeAt(0).toString(16).toUpperCase());

/** OAuth 1.0a one-legged signature as WooCommerce expects it (HMAC-SHA256, key = secret + "&"). */
export function oauth1Params(method: string, baseUrl: string, query: Record<string, string>, key: string, secret: string, now = Date.now(), nonce = randomBytes(16).toString('hex')) {
  const params: Record<string, string> = {
    ...query,
    oauth_consumer_key: key,
    oauth_nonce: nonce,
    oauth_signature_method: 'HMAC-SHA256',
    oauth_timestamp: String(Math.floor(now / 1000)),
  };
  const norm = Object.keys(params)
    .sort()
    .map((k) => `${rfc3986(k)}=${rfc3986(params[k])}`)
    .join('&');
  const base = [method.toUpperCase(), rfc3986(baseUrl), rfc3986(norm)].join('&');
  const signature = createHmac('sha256', `${secret}&`).update(base).digest('base64');
  return { ...params, oauth_signature: signature } as Record<string, string>;
}

type FetchOpts = {
  method?: 'GET' | 'POST' | 'PUT';
  query?: Record<string, string | number | undefined>;
  body?: unknown;
  /** catalog reads are cached (ISR); order reads/writes are not */
  cache?: 'catalog' | 'none';
};

export function isWooConfigured() {
  return wooConfig() !== null;
}

export async function wooFetch<T>(path: string, opts: FetchOpts = {}): Promise<{ data: T; totalPages: number }> {
  const cfg = wooConfig();
  if (!cfg) throw new WooError('WooCommerce is not configured', 503, 'not_configured');
  const method = opts.method ?? 'GET';
  const u = new URL(`${cfg.url}/wp-json/wc/v3/${path.replace(/^\//, '')}`);
  const query: Record<string, string> = {};
  for (const [k, val] of Object.entries(opts.query ?? {})) if (val !== undefined) query[k] = String(val);

  const headers: Record<string, string> = { Accept: 'application/json' };
  if (opts.body !== undefined) headers['Content-Type'] = 'application/json';

  const https = u.protocol === 'https:';
  if (!https && !isLocalHost(u.hostname)) throw new WooError('Refusing to send WooCommerce keys over plain http to a non-local host. Use https.', 500, 'insecure_url');
  const mode = cfg.mode ?? (https ? 'basic' : 'oauth1');

  let finalQuery = query;
  if (mode === 'basic') {
    headers.Authorization = 'Basic ' + Buffer.from(`${cfg.key}:${cfg.secret}`).toString('base64');
  } else if (mode === 'query') {
    finalQuery = { ...query, consumer_key: cfg.key, consumer_secret: cfg.secret };
  } else {
    finalQuery = oauth1Params(method, `${u.origin}${u.pathname}`, query, cfg.key, cfg.secret);
  }
  for (const [k, val] of Object.entries(finalQuery)) u.searchParams.set(k, val);

  const init: RequestInit & { next?: { revalidate?: number; tags?: string[] } } = {
    method,
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  };
  if (opts.cache === 'catalog' && method === 'GET') init.next = { revalidate: REVALIDATE_SECONDS, tags: [CATALOG_TAG] };
  else init.cache = 'no-store';

  let res: Response;
  try {
    res = await fetch(u, { ...init, signal: AbortSignal.timeout(15000) });
  } catch (e) {
    throw new WooError(`WooCommerce request failed: ${(e as Error).message}`, 502, 'network');
  }
  const text = await res.text();
  let json: unknown = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    /* non-JSON (e.g. an HTML error page) */
  }
  if (!res.ok) {
    const j = json as { code?: string; message?: string } | null;
    // Never include the URL here: in query/oauth modes it carries the consumer key.
    throw new WooError(`WooCommerce ${method} ${path} -> ${res.status}${j?.message ? `: ${j.message}` : ''}`, res.status, j?.code);
  }
  return { data: json as T, totalPages: Number(res.headers.get('x-wp-totalpages') ?? '1') || 1 };
}

// ---------- raw WooCommerce shapes (only the fields we use) ----------

type WooImage = { src: string; alt?: string; name?: string };
type WooAttr = { id: number; name: string; option?: string; options?: string[]; variation?: boolean };
export type WooProduct = {
  id: number;
  slug: string;
  name: string;
  type: string;
  status: string;
  sku: string;
  price: string;
  regular_price: string;
  sale_price: string;
  on_sale: boolean;
  purchasable: boolean;
  stock_status: string;
  short_description: string;
  description: string;
  images: WooImage[];
  categories: { id: number; slug: string; name: string }[];
  attributes: WooAttr[];
  variations: number[];
};
type WooVariation = {
  id: number;
  sku: string;
  price: string;
  regular_price: string;
  on_sale: boolean;
  purchasable: boolean;
  stock_status: string;
  attributes: WooAttr[];
  image?: WooImage | null;
};

const num = (s: string | undefined | null) => {
  const n = parseFloat(s ?? '');
  return Number.isFinite(n) ? n : 0;
};

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', '#39': "'", apos: "'", nbsp: ' ', '#8217': '’', '#8216': '‘', '#8220': '“', '#8221': '”', '#8211': '–', '#8212': '—', '#038': '&', '#8377': '₹' };

/** WooCommerce descriptions are HTML. We render them as plain text, never as HTML. */
export function htmlToText(html: string): string {
  return (html ?? '')
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, '')
    .replace(/<\s*br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|h[1-6])>/gi, '\n\n')
    .replace(/<li[^>]*>/gi, '• ')
    .replace(/<[^>]+>/g, '')
    .replace(/&(#?\w+);/g, (m, e) => ENTITIES[e] ?? (e.startsWith('#') ? String.fromCodePoint(parseInt(e.slice(1), 10) || 32) : m))
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function mapVariation(v: WooVariation): Variation {
  const attributes: Record<string, string> = {};
  for (const a of v.attributes ?? []) attributes[a.name] = a.option ?? '';
  return {
    id: v.id,
    attributes,
    price: num(v.price),
    regularPrice: v.on_sale ? num(v.regular_price) : null,
    sku: v.sku ?? '',
    purchasable: !!v.purchasable,
    inStock: v.stock_status !== 'outofstock',
  };
}

export function mapProduct(p: WooProduct, variations: WooVariation[] = []): Product {
  const vars = variations.map(mapVariation);
  const priced = vars.filter((v) => v.purchasable);
  return {
    id: p.id,
    slug: p.slug,
    name: htmlToText(p.name),
    type: p.type === 'variable' ? 'variable' : 'simple',
    price: p.type === 'variable' && priced.length ? Math.min(...priced.map((v) => v.price)) : num(p.price),
    regularPrice: p.on_sale && p.type !== 'variable' ? num(p.regular_price) : null,
    sku: p.sku ?? '',
    images: (p.images ?? []).map((i) => ({ src: i.src, alt: i.alt || i.name || p.name })),
    categories: (p.categories ?? []).map((c) => ({ slug: c.slug, name: htmlToText(c.name) })),
    shortDescription: htmlToText(p.short_description),
    description: htmlToText(p.description),
    attributes: (p.attributes ?? []).filter((a) => a.variation).map((a) => ({ name: a.name, options: a.options ?? [] })),
    variations: vars,
    purchasable: !!p.purchasable && (p.type === 'simple' || p.type === 'variable'),
    inStock: p.stock_status !== 'outofstock',
    sample: false,
  };
}

// ---------- catalog ----------

export async function wooListProducts(opts: { categorySlug?: string } = {}): Promise<Product[]> {
  let categoryId: number | undefined;
  if (opts.categorySlug) {
    const { data } = await wooFetch<{ id: number }[]>('products/categories', { query: { slug: opts.categorySlug }, cache: 'catalog' });
    if (!data.length) return [];
    categoryId = data[0].id;
  }
  const out: Product[] = [];
  for (let page = 1; page <= 10; page++) {
    const { data, totalPages } = await wooFetch<WooProduct[]>('products', {
      query: { status: 'publish', per_page: 100, page, category: categoryId, orderby: 'date', order: 'desc' },
      cache: 'catalog',
    });
    // list views don't need variations; the lowest price comes from p.price, which Woo sets to the min.
    out.push(...data.filter((p) => p.type === 'simple' || p.type === 'variable').map((p) => mapProduct(p)));
    if (page >= totalPages) break;
  }
  return out;
}

async function withVariations(p: WooProduct): Promise<Product> {
  if (p.type !== 'variable' || !p.variations?.length) return mapProduct(p);
  const { data } = await wooFetch<WooVariation[]>(`products/${p.id}/variations`, { query: { per_page: 100 }, cache: 'catalog' });
  return mapProduct(p, data);
}

export async function wooGetProductBySlug(slug: string): Promise<Product | null> {
  const { data } = await wooFetch<WooProduct[]>('products', { query: { slug, status: 'publish' }, cache: 'catalog' });
  return data[0] ? withVariations(data[0]) : null;
}

/** Fresh (uncached) read used for pricing at checkout. */
export async function wooGetProductForPricing(id: number): Promise<Product | null> {
  try {
    const { data } = await wooFetch<WooProduct>(`products/${id}`, { cache: 'none' });
    if (data.status !== 'publish') return null;
    if (data.type !== 'variable') return mapProduct(data);
    const vars = await wooFetch<WooVariation[]>(`products/${id}/variations`, { query: { per_page: 100 }, cache: 'none' });
    return mapProduct(data, vars.data);
  } catch (e) {
    if (e instanceof WooError && e.status === 404) return null;
    throw e;
  }
}

// ---------- orders ----------

export type WooAddress = {
  first_name: string;
  last_name: string;
  company?: string;
  address_1: string;
  address_2: string;
  city: string;
  state: string;
  postcode: string;
  country: string;
  email?: string;
  phone?: string;
};
export type WooOrder = {
  id: number;
  number: string;
  order_key: string;
  status: string;
  currency: string;
  date_created: string;
  date_paid: string | null;
  total: string;
  payment_method: string;
  payment_method_title: string;
  transaction_id: string;
  set_paid?: boolean;
  billing: WooAddress;
  shipping: WooAddress;
  customer_note?: string;
  line_items: { id: number; name: string; product_id: number; variation_id: number; quantity: number; sku: string; price: number; total: string; meta_data?: { key: string; value: unknown; display_key?: string; display_value?: string }[] }[];
  meta_data: { id?: number; key: string; value: unknown }[];
};

export async function wooCreateOrder(body: Record<string, unknown>) {
  return (await wooFetch<WooOrder>('orders', { method: 'POST', body })).data;
}
export async function wooGetOrder(id: number) {
  return (await wooFetch<WooOrder>(`orders/${id}`)).data;
}
export async function wooUpdateOrder(id: number, body: Record<string, unknown>) {
  return (await wooFetch<WooOrder>(`orders/${id}`, { method: 'PUT', body })).data;
}
export async function wooListOrders(status: string, maxPages = 10): Promise<WooOrder[]> {
  const out: WooOrder[] = [];
  for (let page = 1; page <= maxPages; page++) {
    const { data, totalPages } = await wooFetch<WooOrder[]>('orders', { query: { status, per_page: 100, page, orderby: 'date', order: 'asc' } });
    out.push(...data);
    if (page >= totalPages) break;
  }
  return out;
}
