import 'server-only';
import { razorpayConfig } from './env';

// Minimal Razorpay Orders/Payments API client (https://razorpay.com/docs/api/). Server-only.

const API = 'https://api.razorpay.com/v1';

export type RzpOrder = {
  id: string;
  entity: 'order';
  amount: number; // paise
  amount_paid: number;
  currency: string;
  receipt: string | null;
  status: 'created' | 'attempted' | 'paid';
  notes: Record<string, string> | [];
  created_at: number;
};
export type RzpPayment = {
  id: string;
  entity: 'payment';
  amount: number;
  currency: string;
  status: 'created' | 'authorized' | 'captured' | 'refunded' | 'failed';
  order_id: string | null;
  method: string;
  email?: string;
  contact?: string;
  captured: boolean;
};

export class RazorpayError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

async function rzp<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  const cfg = razorpayConfig();
  if (!cfg) throw new RazorpayError('Razorpay is not configured', 503);
  const res = await fetch(`${API}/${path}`, {
    method: init.method ?? 'GET',
    headers: {
      Authorization: 'Basic ' + Buffer.from(`${cfg.keyId}:${cfg.keySecret}`).toString('base64'),
      'Content-Type': 'application/json',
    },
    body: init.body ? JSON.stringify(init.body) : undefined,
    cache: 'no-store',
    signal: AbortSignal.timeout(15000),
  });
  const json = (await res.json().catch(() => null)) as (T & { error?: { description?: string } }) | null;
  if (!res.ok || !json) throw new RazorpayError(`Razorpay ${path} -> ${res.status}${json?.error?.description ? `: ${json.error.description}` : ''}`, res.status);
  return json;
}

export const createRzpOrder = (amountPaise: number, receipt: string, notes: Record<string, string>) =>
  rzp<RzpOrder>('orders', { method: 'POST', body: { amount: amountPaise, currency: 'INR', receipt: receipt.slice(0, 40), notes } });
export const fetchRzpOrder = (id: string) => rzp<RzpOrder>(`orders/${encodeURIComponent(id)}`);
export const fetchRzpPayment = (id: string) => rzp<RzpPayment>(`payments/${encodeURIComponent(id)}`);
export const updateRzpOrderNotes = (id: string, notes: Record<string, string>) =>
  rzp<RzpOrder>(`orders/${encodeURIComponent(id)}`, { method: 'PATCH', body: { notes } });

export const notesOf = (o: RzpOrder): Record<string, string> => (Array.isArray(o.notes) ? {} : o.notes ?? {});

export const isRzpOrderId = (s: unknown): s is string => typeof s === 'string' && /^order_[A-Za-z0-9]{6,40}$/.test(s);
export const isRzpPaymentId = (s: unknown): s is string => typeof s === 'string' && /^pay_[A-Za-z0-9]{6,40}$/.test(s);
